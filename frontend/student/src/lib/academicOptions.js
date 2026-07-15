export const COLLEGE_CODES = ['FST', 'SCC', 'FBM', 'FHSS'];

export const MAJOR_CODES = [
  'BA',
  'CCM',
  'MKT',
  'FIN',
  'MHR',
  'EBIS',
  'EPIN',
  'DMM',
  'CST',
  'DS',
  'AIM',
  'CTV',
  'CCGC',
  'PRA',
  'MAD',
  'MCOM',
  'GD',
  'DIS',
  'TDH',
  'DGS',
  'GAD',
  'BUSA',
  'AE',
  'ACCT',
  'AI',
  'AM',
  'APSY',
  'ELLS',
  'ENVS',
  'FM',
  'FS',
  'MUS',
  'STAT',
];

export function enrollmentCohortOptions(now = new Date()) {
  const newestYear = now.getFullYear() + 1;
  return Array.from({ length: 12 }, (_, index) => `${newestYear - index}届`);
}
