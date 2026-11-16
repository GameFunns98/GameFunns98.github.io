export interface Project {
  key: string;
  title: { cs: string; en: string };
  repo: string;
  tags: string[];
  description: { cs: string; en: string };
}

export const projects: Project[] = [
  {
    key: 'report',
    title: { cs: 'Lékařská zpráva', en: 'Medical report' },
    repo: 'Lekarska-Zprava',
    tags: ['Next.js', 'TypeScript'],
    description: {
      cs: 'Generátor lékařských zpráv, ve kterém mají anamnéza, vyšetření i závěr své místo.',
      en: 'A medical report builder that gives history, examinations and findings a place of their own.',
    },
  },
  {
    key: 'ems',
    title: { cs: 'EMS App', en: 'EMS App' },
    repo: 'EMS_APP',
    tags: ['Next.js', 'Drizzle', 'PostgreSQL'],
    description: {
      cs: 'Směny, výcvik a certifikace pro tým záchranářů v roleplay komunitě.',
      en: 'Shifts, training and certifications for a roleplay emergency medical team.',
    },
  },
  {
    key: 'nucleares',
    title: { cs: 'Nucleares automation', en: 'Nucleares automation' },
    repo: 'Nucleares-automation',
    tags: ['Python', 'Flask'],
    description: {
      cs: 'Pohled do řídicí místnosti. Přehled telemetrie, grafů a alarmů ze hry Nucleares.',
      en: 'A view into the control room, with telemetry, charts and alarms from Nucleares.',
    },
  },
  {
    key: 'medical',
    title: { cs: 'Medical Mod', en: 'Medical Mod' },
    repo: 'medical-mod',
    tags: ['Java', 'Minecraft Forge'],
    description: {
      cs: 'Zdravotnictví uvnitř Minecraftu. Vlastní herní mechanismy pro Forge 1.20.1.',
      en: 'Healthcare inside Minecraft, with custom game mechanics for Forge 1.20.1.',
    },
  },
];
