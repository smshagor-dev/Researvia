'use client';

import { useState } from 'react';

type University = {
  name: string;
  domain: string;
};

const universities: University[] = [
  { name: 'MIT', domain: 'mit.edu' },
  { name: 'Stanford', domain: 'stanford.edu' },
  { name: 'Harvard', domain: 'harvard.edu' },
  { name: 'Caltech', domain: 'caltech.edu' },
  { name: 'Oxford', domain: 'ox.ac.uk' },
  { name: 'Cambridge', domain: 'cam.ac.uk' },
  { name: 'Princeton', domain: 'princeton.edu' },
  { name: 'Yale', domain: 'yale.edu' },
  { name: 'Columbia', domain: 'columbia.edu' },
  { name: 'University of Chicago', domain: 'uchicago.edu' },
  { name: 'UPenn', domain: 'upenn.edu' },
  { name: 'Cornell', domain: 'cornell.edu' },
  { name: 'Berkeley', domain: 'berkeley.edu' },
  { name: 'UCLA', domain: 'ucla.edu' },
  { name: 'UC San Diego', domain: 'ucsd.edu' },
  { name: 'UC Davis', domain: 'ucdavis.edu' },
  { name: 'UC Irvine', domain: 'uci.edu' },
  { name: 'UC Santa Barbara', domain: 'ucsb.edu' },
  { name: 'University of Michigan', domain: 'umich.edu' },
  { name: 'Johns Hopkins', domain: 'jhu.edu' },
  { name: 'Duke', domain: 'duke.edu' },
  { name: 'Northwestern', domain: 'northwestern.edu' },
  { name: 'NYU', domain: 'nyu.edu' },
  { name: 'Carnegie Mellon', domain: 'cmu.edu' },
  { name: 'Georgia Tech', domain: 'gatech.edu' },
  { name: 'University of Washington', domain: 'washington.edu' },
  { name: 'UT Austin', domain: 'utexas.edu' },
  { name: 'UIUC', domain: 'illinois.edu' },
  { name: 'Wisconsin-Madison', domain: 'wisc.edu' },
  { name: 'Purdue', domain: 'purdue.edu' },
  { name: 'Penn State', domain: 'psu.edu' },
  { name: 'Ohio State', domain: 'osu.edu' },
  { name: 'Brown', domain: 'brown.edu' },
  { name: 'Dartmouth', domain: 'dartmouth.edu' },
  { name: 'Rice', domain: 'rice.edu' },
  { name: 'Vanderbilt', domain: 'vanderbilt.edu' },
  { name: 'Emory', domain: 'emory.edu' },
  { name: 'Washington University', domain: 'wustl.edu' },
  { name: 'University of Florida', domain: 'ufl.edu' },
  { name: 'University of Maryland', domain: 'umd.edu' },
  { name: 'UNC Chapel Hill', domain: 'unc.edu' },
  { name: 'University of Virginia', domain: 'virginia.edu' },
  { name: 'Boston University', domain: 'bu.edu' },
  { name: 'USC', domain: 'usc.edu' },
  { name: 'Georgetown', domain: 'georgetown.edu' },
  { name: 'Notre Dame', domain: 'nd.edu' },
  { name: 'Tufts', domain: 'tufts.edu' },
  { name: 'Rochester', domain: 'rochester.edu' },
  { name: 'Case Western', domain: 'case.edu' },
  { name: 'Arizona State', domain: 'asu.edu' },
  { name: 'University of Arizona', domain: 'arizona.edu' },
  { name: 'Michigan State', domain: 'msu.edu' },
  { name: 'Texas A&M', domain: 'tamu.edu' },
  { name: 'University of Minnesota', domain: 'umn.edu' },
  { name: 'University of Pittsburgh', domain: 'pitt.edu' },
  { name: 'Rutgers', domain: 'rutgers.edu' },
  { name: 'Northeastern', domain: 'northeastern.edu' },
  { name: 'UCSF', domain: 'ucsf.edu' },
  { name: 'ETH Zurich', domain: 'ethz.ch' },
  { name: 'EPFL', domain: 'epfl.ch' },
  { name: 'Imperial College London', domain: 'imperial.ac.uk' },
  { name: 'UCL', domain: 'ucl.ac.uk' },
  { name: 'King’s College London', domain: 'kcl.ac.uk' },
  { name: 'LSE', domain: 'lse.ac.uk' },
  { name: 'University of Edinburgh', domain: 'ed.ac.uk' },
  { name: 'University of Manchester', domain: 'manchester.ac.uk' },
  { name: 'University of Warwick', domain: 'warwick.ac.uk' },
  { name: 'University of Bristol', domain: 'bristol.ac.uk' },
  { name: 'University of Glasgow', domain: 'gla.ac.uk' },
  { name: 'University of Leeds', domain: 'leeds.ac.uk' },
  { name: 'University of Birmingham', domain: 'birmingham.ac.uk' },
  { name: 'University of Southampton', domain: 'southampton.ac.uk' },
  { name: 'TUM', domain: 'tum.de' },
  { name: 'LMU Munich', domain: 'lmu.de' },
  { name: 'Heidelberg University', domain: 'uni-heidelberg.de' },
  { name: 'Humboldt University', domain: 'hu-berlin.de' },
  { name: 'RWTH Aachen', domain: 'rwth-aachen.de' },
  { name: 'Technical University Berlin', domain: 'tu.berlin' },
  { name: 'University of Bonn', domain: 'uni-bonn.de' },
  { name: 'University of Amsterdam', domain: 'uva.nl' },
  { name: 'Delft University', domain: 'tudelft.nl' },
  { name: 'Leiden University', domain: 'universiteitleiden.nl' },
  { name: 'Utrecht University', domain: 'uu.nl' },
  { name: 'KU Leuven', domain: 'kuleuven.be' },
  { name: 'Sorbonne University', domain: 'sorbonne-universite.fr' },
  { name: 'PSL University', domain: 'psl.eu' },
  { name: 'Sciences Po', domain: 'sciencespo.fr' },
  { name: 'University of Copenhagen', domain: 'ku.dk' },
  { name: 'Lund University', domain: 'lu.se' },
  { name: 'KTH Royal Institute', domain: 'kth.se' },
  { name: 'Karolinska Institute', domain: 'ki.se' },
  { name: 'University of Helsinki', domain: 'helsinki.fi' },
  { name: 'Aalto University', domain: 'aalto.fi' },
  { name: 'University of Oslo', domain: 'uio.no' },
  { name: 'Trinity College Dublin', domain: 'tcd.ie' },
  { name: 'University of Bologna', domain: 'unibo.it' },
  { name: 'Sapienza University', domain: 'uniroma1.it' },
  { name: 'University of Barcelona', domain: 'ub.edu' },
  { name: 'Autonomous University Madrid', domain: 'uam.es' },
  { name: 'University of Toronto', domain: 'utoronto.ca' },
  { name: 'McGill', domain: 'mcgill.ca' },
  { name: 'University of British Columbia', domain: 'ubc.ca' },
  { name: 'University of Alberta', domain: 'ualberta.ca' },
  { name: 'McMaster', domain: 'mcmaster.ca' },
  { name: 'University of Waterloo', domain: 'uwaterloo.ca' },
  { name: 'University of Montreal', domain: 'umontreal.ca' },
  { name: 'University of Sydney', domain: 'sydney.edu.au' },
  { name: 'University of Melbourne', domain: 'unimelb.edu.au' },
  { name: 'ANU', domain: 'anu.edu.au' },
  { name: 'UNSW Sydney', domain: 'unsw.edu.au' },
  { name: 'University of Queensland', domain: 'uq.edu.au' },
  { name: 'Monash University', domain: 'monash.edu' },
  { name: 'University of Auckland', domain: 'auckland.ac.nz' },
  { name: 'National University of Singapore', domain: 'nus.edu.sg' },
  { name: 'Nanyang Technological University', domain: 'ntu.edu.sg' },
  { name: 'University of Hong Kong', domain: 'hku.hk' },
  { name: 'CUHK', domain: 'cuhk.edu.hk' },
  { name: 'HKUST', domain: 'hkust.edu.hk' },
  { name: 'Peking University', domain: 'pku.edu.cn' },
  { name: 'Tsinghua University', domain: 'tsinghua.edu.cn' },
  { name: 'Fudan University', domain: 'fudan.edu.cn' },
  { name: 'Shanghai Jiao Tong', domain: 'sjtu.edu.cn' },
  { name: 'Zhejiang University', domain: 'zju.edu.cn' },
  { name: 'University of Tokyo', domain: 'u-tokyo.ac.jp' },
  { name: 'Kyoto University', domain: 'kyoto-u.ac.jp' },
  { name: 'Tokyo Tech', domain: 'titech.ac.jp' },
  { name: 'Osaka University', domain: 'osaka-u.ac.jp' },
  { name: 'Seoul National University', domain: 'snu.ac.kr' },
  { name: 'KAIST', domain: 'kaist.ac.kr' },
  { name: 'POSTECH', domain: 'postech.ac.kr' },
  { name: 'IIT Bombay', domain: 'iitb.ac.in' },
  { name: 'IIT Delhi', domain: 'iitd.ac.in' },
  { name: 'Indian Institute of Science', domain: 'iisc.ac.in' },
  { name: 'Hebrew University', domain: 'huji.ac.il' },
  { name: 'Tel Aviv University', domain: 'tau.ac.il' },
  { name: 'King Abdulaziz University', domain: 'kau.edu.sa' },
  { name: 'King Abdullah University', domain: 'kaust.edu.sa' },
  { name: 'University of Cape Town', domain: 'uct.ac.za' },
  { name: 'University of São Paulo', domain: 'usp.br' },
  { name: 'UNAM', domain: 'unam.mx' },
  { name: 'University of Buenos Aires', domain: 'uba.ar' },
];

const logoOverrides: Record<string, string> = {
  'mit.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/MIT_logo_2003-2023.svg',
  'stanford.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Stanford_logo.png',
  'harvard.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Harvard_University_logo.svg',
  'caltech.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Caltech_Logo.svg',
  'ox.ac.uk': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Oxford.svg',
  'cam.ac.uk': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Cambridge_logo.png',
  'princeton.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Princeton_University_logo.svg',
  'yale.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Yale_University_logo.svg',
  'columbia.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Columbia_University_wordmark.svg',
  'uchicago.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Chicago_wordmark.svg',
  'upenn.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/UPenn_shield_with_banner.svg',
  'cornell.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Cornell_University_Logo.svg',
  'berkeley.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_California%2C_Berkeley_logo.svg',
  'ucla.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/UCLA_logo.svg',
  'umich.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Michigan_logo.svg',
  'jhu.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Johns_Hopkins_University_logo.svg',
  'duke.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Duke_University_logo.svg',
  'nyu.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/New_York_University_logo.svg',
  'cmu.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Carnegie_Mellon_University_wordmark.svg',
  'gatech.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Georgia_Tech_logo.svg',
  'utexas.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Texas_at_Austin_logo.svg',
  'brown.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Brown_University_logo.svg',
  'dartmouth.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Dartmouth_College_logo.svg',
  'rice.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Rice_University_logo.svg',
  'usc.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Southern_California_logo.svg',
  'ethz.ch': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/ETH_Z%C3%BCrich_Logo.svg',
  'epfl.ch': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/EPFL_logo.svg',
  'imperial.ac.uk': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Imperial_College_London_new_logo.svg',
  'ucl.ac.uk': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_College_London_logo.svg',
  'kcl.ac.uk': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/King%27s_College_London_logo.svg',
  'lse.ac.uk': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/LSE_Logo.svg',
  'ed.ac.uk': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Edinburgh_logo.svg',
  'manchester.ac.uk': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Manchester_logo.svg',
  'warwick.ac.uk': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Warwick_logo.svg',
  'tum.de': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo_of_the_Technical_University_of_Munich.svg',
  'lmu.de': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/LMU_Muenchen_Logo.svg',
  'uni-heidelberg.de': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Universit%C3%A4t_Heidelberg_logo.svg',
  'hu-berlin.de': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Humboldt-Universit%C3%A4t_zu_Berlin_logo.svg',
  'rwth-aachen.de': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/RWTH_Aachen_University_logo.svg',
  'uva.nl': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Universiteit_van_Amsterdam_logo.svg',
  'tudelft.nl': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/TU_Delft_Logo.svg',
  'universiteitleiden.nl': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Leiden_University_Logo.svg',
  'uu.nl': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Utrecht_University_logo.svg',
  'kuleuven.be': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/KU_Leuven_logo.svg',
  'utoronto.ca': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Toronto_Logo.svg',
  'mcgill.ca': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/McGill_University_logo.svg',
  'ubc.ca': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_British_Columbia_logo.svg',
  'uwaterloo.ca': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Waterloo_seal.svg',
  'sydney.edu.au': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/The_University_of_Sydney_logo.svg',
  'unimelb.edu.au': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Melbourne_logo.svg',
  'anu.edu.au': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Australian_National_University_logo.svg',
  'unsw.edu.au': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/UNSW_Sydney_logo.svg',
  'uq.edu.au': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Queensland_Logo.svg',
  'monash.edu': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Monash_University_logo.svg',
  'nus.edu.sg': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/National_University_of_Singapore_logo.svg',
  'ntu.edu.sg': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Nanyang_Technological_University_logo.svg',
  'hku.hk': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Hong_Kong_Logo.svg',
  'cuhk.edu.hk': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/The_Chinese_University_of_Hong_Kong_logo.svg',
  'hkust.edu.hk': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/HKUST_Logo.svg',
  'pku.edu.cn': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Peking_University_logo.svg',
  'tsinghua.edu.cn': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Tsinghua_University_Logo.svg',
  'u-tokyo.ac.jp': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/University_of_Tokyo_logo.svg',
  'kyoto-u.ac.jp': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Kyoto_University_logo.svg',
  'snu.ac.kr': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Seoul_National_University_logo.svg',
  'kaist.ac.kr': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/KAIST_logo.svg',
  'iitb.ac.in': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/IIT_Bombay_Logo.svg',
  'iitd.ac.in': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/IIT_Delhi_Logo.svg',
  'iisc.ac.in': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Indian_Institute_of_Science_2019_logo.svg',
};

const logoUrl = (domain: string) => `https://logo.clearbit.com/${domain}`;
const faviconUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
const iconHorseUrl = (domain: string) => `https://icon.horse/icon/${domain}`;
const generatedLogoUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=EEF2FF&color=4F46E5&bold=true&format=svg`;

function UniversityLogo({ university, duplicate }: { university: University; duplicate: boolean }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const sources = [
    logoOverrides[university.domain],
    logoUrl(university.domain),
    faviconUrl(university.domain),
    iconHorseUrl(university.domain),
    generatedLogoUrl(university.name),
  ].filter(Boolean);
  const initials = university.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  if (sourceIndex >= sources.length) {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 text-xs font-black tracking-tight text-indigo-700">
        {initials}
      </span>
    );
  }

  return (
    <img
      src={sources[sourceIndex]}
      alt={duplicate ? '' : `${university.name} logo`}
      className="max-h-9 max-w-full object-contain opacity-90 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
      loading="lazy"
      onError={() => setSourceIndex((current) => current + 1)}
    />
  );
}

export function TrustedLogos() {
  const scrollingLogos = [...universities, ...universities];

  return (
    <section className="border-b border-slate-200 bg-white px-4 py-10 dark:border-white/10 dark:bg-[#050816] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-sm font-semibold text-slate-500 dark:text-slate-400">Trusted by students from top universities worldwide</p>
        <div className="trusted-logo-mask mt-7 overflow-hidden" aria-label="Trusted university logos">
          <div className="trusted-logo-marquee flex w-max gap-3 hover:[animation-play-state:paused]">
            {scrollingLogos.map((university, index) => (
              <div
                key={`${university.name}-${index}`}
                className="group flex h-28 w-44 flex-none flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-400/40 dark:hover:bg-white/[0.07]"
                aria-hidden={index >= universities.length}
                title={university.name}
              >
                <div className="flex h-16 w-full items-center justify-center border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <UniversityLogo university={university} duplicate={index >= universities.length} />
                </div>
                <div className="flex h-12 w-full items-center justify-center px-3">
                  <span className="line-clamp-2 text-center text-xs font-semibold leading-4 text-slate-500 transition group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-white">
                    {university.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
