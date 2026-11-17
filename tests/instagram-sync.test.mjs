import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { syncInstagram } from '../scripts/sync-instagram.mjs';

const profile = { username:'vevoda_vaclav', user_id:'1234', account_type:'MEDIA_CREATOR' };
const media = {
  id:'882', media_type:'VIDEO', caption:'A test', timestamp:'2026-11-20T09:30:00Z',
  media_url:'https://scontent.cdninstagram.com/video', thumbnail_url:'https://scontent.cdninstagram.com/cover',
  permalink:'https://www.instagram.com/reel/test_id/',
};
const token = 'private-test-token';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8SWv0AAAAASUVORK5CYII=', 'base64');
const image = () => new Response(png, { headers:{'content-type':'image/png'} });
const json = value => Response.json(value);
const snapshot = cwd => readFile(path.join(cwd,'src','data','instagram.json'),'utf8');
async function temporary(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(),'gf-ig-'));
  t.after(() => rm(dir, {recursive:true,force:true}));
  return dir;
}

test('auth requests use headers, video downloads only its public cover, local snapshot contains no credentials',async t => {
  const cwd = await temporary(t);
  const stages = [];
  const fetcher = async (url, options) => {
    stages.push(url.pathname);
    assert.equal(options.redirect,'error');
    assert.ok(options.signal);
    assert.ok(!url.href.includes(token));
    if (url.hostname === 'graph.instagram.com') {
      assert.equal(options.headers.Authorization, 'Bearer ' + token);
      if (url.pathname.endsWith('/me')) return json(profile);
      assert.equal(url.searchParams.get('limit'),'6');
      assert.match(url.searchParams.get('fields'),/children/);
      return json({data:[media]});
    }
    assert.equal(options.headers,undefined);
    return image();
  };
  assert.deepEqual(await syncInstagram({cwd,token,fetcher}), {status:'connected',count:1});
  assert.deepEqual(stages,['/v27.0/me','/v27.0/1234/media','/cover']);
  const publicData = await snapshot(cwd);
  assert.ok(!publicData.includes(token));
  assert.ok(!publicData.includes('cdninstagram.com'));
  assert.equal(JSON.parse(publicData).posts[0].poster,'/images/instagram/882.png');
  assert.deepEqual(await readFile(path.join(cwd,'public','images','instagram','882.png')),png);
});

test('missing token leaves the workspace untouched',async t => {
  const cwd = await temporary(t);
  assert.deepEqual(await syncInstagram({cwd,token:'',fetcher:() => assert.fail('unexpected network request')}),{status:'skipped'});
  await assert.rejects(snapshot(cwd),{code:'ENOENT'});
});

test('the documented one-item profile wrapper is verified before media is read',async t => {
  const cwd = await temporary(t);
  const fetcher = async (url, options) => {
    if (url.hostname !== 'graph.instagram.com') return image();
    assert.equal(options.headers.Authorization, 'Bearer ' + token);
    if (url.pathname.endsWith('/me')) return json({data:[profile]});
    return json({data:[media]});
  };
  assert.deepEqual(await syncInstagram({cwd,token:' \n' + token + '\n ',fetcher}),{status:'connected',count:1});
  assert.equal(JSON.parse(await snapshot(cwd)).posts[0].id,media.id);
});

test('API diagnostics keep only fixed stages and numeric codes, never upstream secret-bearing text',async t => {
  const cwd = await temporary(t);
  const failure = await syncInstagram({cwd,token,fetcher:() => new Response(JSON.stringify({
    error:{code:190,error_subcode:463,message:'Token ' + token,secret:token},
  }),{status:400,headers:{'content-type':'application/json'}})});
  assert.deepEqual(failure,{status:'unavailable',diagnostic:{stage:'profile',reason:'api-request-rejected',httpStatus:400,apiCode:190,apiSubcode:463}});
  assert.ok(!JSON.stringify(failure).includes(token));
  assert.ok(!String(await snapshot(cwd)).includes(token));
});

test('verified source imports a carousel child without Graph access; failed refresh keeps previous date and posts',async t => {
  const cwd = await temporary(t);
  const carousel = {...media,media_type:'CAROUSEL_ALBUM',media_url:null,children:{data:[media]}};
  const result = await syncInstagram({cwd,source:{profile,media:[carousel]},fetcher:url => {
    assert.equal(url.href,media.thumbnail_url);
    return image();
  }});
  assert.equal(result.status,'connected');
  const previous = JSON.parse(await snapshot(cwd));
  const next = {...media,id:'883'};
  const failure = await syncInstagram({cwd,token,source:{profile,media:[next]},fetcher:() => {
    throw new Error('upstream request included credential ' + token);
  }});
  assert.equal(failure.status,'unavailable');
  const current = await snapshot(cwd);
  assert.deepEqual(JSON.parse(current),{...previous,status:'unavailable'});
  assert.ok(!current.includes(token));
  await assert.rejects(access(path.join(cwd,'public','images','instagram','883.png')),{code:'ENOENT'});
});

test('wrong account, personal profile, invalid CDN and content type cannot publish posts',async t => {
  const cases = [
    { profile:{...profile,username:'other'}, item:media, expectedRequests:0 },
    { profile:{...profile,account_type:'PERSONAL'}, item:media, expectedRequests:0 },
    { profile, item:{...media,thumbnail_url:'https://evil.test/x.jpg'}, expectedRequests:0 },
    { profile, item:media, expectedRequests:1 },
  ];
  for (const fixture of cases) {
    const cwd = await temporary(t);
    let calls = 0;
    await syncInstagram({cwd,source:{profile:fixture.profile,media:[fixture.item]},fetcher:() => {
      calls++;
      return new Response(png,{headers:{'content-type':'image/jpeg'}});
    }});
    assert.equal(calls,fixture.expectedRequests);
    const current = JSON.parse(await snapshot(cwd));
    assert.equal(current.status,'unavailable');
    assert.equal(current.fetchedAt,null);
    assert.deepEqual(current.posts,[]);
  }
});
