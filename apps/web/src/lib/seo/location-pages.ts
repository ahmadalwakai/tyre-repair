import type { LocationPage, LocationContentSection, LocationFaqItem } from '@/types/seo';

/**
 * Location data for tyrerepair.uk.
 *
 * Strategy:
 *   - 12 priority-1 pages are hand-crafted with rich, city-specific copy.
 *   - 20 standard priority-2 pages are hand-crafted with focused copy.
 *   - 333 priority-3 pages are generated from a regional master list using
 *     a template engine that varies localContext, roadContext, nearby areas,
 *     common call-out scenarios and FAQ wording per region.
 *
 * The business is Glasgow-based and mobile across Scotland — every page
 * states this clearly and never invents a local branch.
 */

interface RegionTemplate {
  region: string;
  /** Sample arterial roads or routes typical for this region. */
  roads: readonly string[];
  /** Adjacent towns / districts shown as nearbyAreas examples. */
  representativeNearby: readonly string[];
  /** Description of the regional driving environment used in localContext. */
  contextLine: string;
  /** Common call-out lines for the region. */
  callouts: readonly string[];
}

const REGION_TEMPLATES: Record<string, RegionTemplate> = {
  glasgowWest: {
    region: 'Glasgow & West',
    roads: ['M8', 'M77', 'M74', 'A82', 'A726'],
    representativeNearby: ['Glasgow city centre', 'Paisley', 'East Kilbride', 'Hamilton'],
    contextLine:
      'Greater Glasgow streets, Clydeside arterials and the M8 corridor mean tyre damage from kerbs, potholes and motorway debris is a regular call.',
    callouts: [
      'flat tyre on the driveway',
      'kerb damage in a residential street',
      'puncture caught on the school run',
      'blowout on the M8 slip road',
    ],
  },
  edinburghLothians: {
    region: 'Edinburgh & Lothians',
    roads: ['M8', 'M9', 'A1', 'A720 city bypass', 'A702'],
    representativeNearby: ['Edinburgh city centre', 'Leith', 'Livingston', 'Musselburgh'],
    contextLine:
      'Edinburgh’s mix of cobbled city centre streets, the A720 city bypass and the M8/M9 corridor produces a steady stream of kerb scrapes and motorway debris punctures.',
    callouts: [
      'kerb damage on a cobbled street',
      'flat tyre at home in the suburbs',
      'puncture during the bypass commute',
      'tyre blow on the A1 heading south',
    ],
  },
  highlands: {
    region: 'Highlands',
    roads: ['A9', 'A82', 'A87', 'A832'],
    representativeNearby: ['Inverness', 'Fort William', 'Aviemore', 'Ullapool'],
    contextLine:
      'Highland routes mean long stretches between towns, weather-affected surfaces and limited late-night options for tyre help — the right answer is mobile cover that comes to the vehicle.',
    callouts: [
      'flat tyre on a Highland single track road',
      'sidewall damage from a verge edge',
      'puncture on the A9 corridor',
      'winter weather tyre damage',
    ],
  },
  aberdeen: {
    region: 'Aberdeen & Aberdeenshire',
    roads: ['A90', 'A96', 'A93', 'A944'],
    representativeNearby: ['Aberdeen city centre', 'Dyce', 'Westhill', 'Stonehaven'],
    contextLine:
      'North-east commuting on the A90, A96 and A944 brings regular puncture and kerb-damage call outs from city, suburb and rural drivers.',
    callouts: [
      'flat tyre at home in a north-east suburb',
      'puncture on the A90 commute',
      'kerb damage in town centre parking',
      'blowout on the A96',
    ],
  },
  dundee: {
    region: 'Dundee & Angus',
    roads: ['A90', 'A92', 'A930', 'A923'],
    representativeNearby: ['Dundee city centre', 'Broughty Ferry', 'Carnoustie', 'Forfar'],
    contextLine:
      'Dundee city, Tayside towns and the A90 corridor produce a steady mix of urban kerb damage and motorway-grade punctures.',
    callouts: [
      'flat tyre on a Tayside driveway',
      'puncture on the A90',
      'kerb damage in town centre parking',
      'late-night tyre call near the city',
    ],
  },
  fife: {
    region: 'Fife',
    roads: ['M90', 'A92', 'A91', 'A915'],
    representativeNearby: ['Dunfermline', 'Kirkcaldy', 'Glenrothes', 'St Andrews'],
    contextLine:
      'Fife commuter routes, the M90 and the cross-Forth corridor mean regular punctures and kerb-strike call outs across the kingdom.',
    callouts: [
      'flat tyre on the Fife commute',
      'puncture after a Forth crossing',
      'kerb damage in a Fife town centre',
      'tyre damage on rural roads',
    ],
  },
  stirlingForth: {
    region: 'Stirling & Forth Valley',
    roads: ['M9', 'M80', 'A91', 'A811'],
    representativeNearby: ['Stirling', 'Falkirk', 'Alloa', 'Larbert'],
    contextLine:
      'The Forth Valley corridor between Glasgow and Edinburgh runs heavy traffic on the M9 and M80, with regular puncture and blowout calls.',
    callouts: [
      'flat tyre on the M9 commute',
      'kerb damage in town centre parking',
      'puncture on the M80',
      'late-night tyre call before a morning shift',
    ],
  },
  borders: {
    region: 'Scottish Borders',
    roads: ['A1', 'A68', 'A7', 'A698'],
    representativeNearby: ['Galashiels', 'Hawick', 'Peebles', 'Kelso'],
    contextLine:
      'Borders driving covers long rural routes between market towns, with weather and verge damage common causes of tyre call outs.',
    callouts: [
      'flat tyre on a rural Borders road',
      'sidewall damage from a verge',
      'puncture on the A68 or A7',
      'tyre help in a small market town',
    ],
  },
  dumfries: {
    region: 'Dumfries & Galloway',
    roads: ['A75', 'A76', 'A77', 'M74'],
    representativeNearby: ['Dumfries', 'Stranraer', 'Castle Douglas', 'Lockerbie'],
    contextLine:
      'South-west Scotland routes are long, often quiet, and weather-exposed — a flat tyre on the A75 or M74 needs mobile help that knows the area.',
    callouts: [
      'flat tyre on the A75',
      'puncture on the M74',
      'sidewall damage on a rural road',
      'late-night tyre call in the south-west',
    ],
  },
  argyllBute: {
    region: 'Argyll & Bute',
    roads: ['A82', 'A83', 'A816', 'A814'],
    representativeNearby: ['Oban', 'Helensburgh', 'Dunoon', 'Lochgilphead'],
    contextLine:
      'Argyll roads run along sea lochs and through the Trossachs — surfaces vary, verges are tight, and tyre damage from rough edges is a regular cause of call outs.',
    callouts: [
      'flat tyre on a coastal road',
      'kerb or verge damage on a single track',
      'puncture on the A82 or A83',
      'tyre help on a Highland-edge route',
    ],
  },
  ayrshire: {
    region: 'Ayrshire',
    roads: ['A77', 'A78', 'A71', 'A719'],
    representativeNearby: ['Ayr', 'Kilmarnock', 'Irvine', 'Prestwick'],
    contextLine:
      'Ayrshire commuting on the A77 and A78, plus Glasgow-bound traffic, produces regular punctures and kerb damage call outs.',
    callouts: [
      'flat tyre on the A77 commute',
      'kerb damage in coastal town parking',
      'puncture heading into Glasgow',
      'late-night tyre call near the airport',
    ],
  },
  lanarkshire: {
    region: 'Lanarkshire',
    roads: ['M74', 'M73', 'M8', 'A725', 'A726'],
    representativeNearby: ['Hamilton', 'Motherwell', 'East Kilbride', 'Wishaw'],
    contextLine:
      'Lanarkshire sits at the junction of the M74, M73 and M8 — a high-traffic corridor where punctures and blowouts are everyday tyre call outs.',
    callouts: [
      'flat tyre on the M74',
      'kerb damage in a town centre',
      'puncture during a school run',
      'late-night tyre call before a shift',
    ],
  },
  renfrewshire: {
    region: 'Renfrewshire',
    roads: ['M8', 'A737', 'A761', 'A726'],
    representativeNearby: ['Paisley', 'Renfrew', 'Johnstone', 'Erskine'],
    contextLine:
      'Renfrewshire commuting around the M8 and Glasgow Airport produces a steady mix of urban kerb damage and motorway-grade punctures.',
    callouts: [
      'flat tyre on the M8',
      'kerb damage near the airport',
      'puncture on the A737',
      'school-run tyre call out',
    ],
  },
  inverclyde: {
    region: 'Inverclyde',
    roads: ['A8', 'M8', 'A761', 'A78'],
    representativeNearby: ['Greenock', 'Port Glasgow', 'Gourock', 'Kilmacolm'],
    contextLine:
      'Inverclyde routes run between the Clyde coast and the M8, with regular puncture call outs from commuters and ferry-bound drivers.',
    callouts: [
      'flat tyre on the A8',
      'kerb damage in coastal parking',
      'puncture on the M8 west',
      'tyre help before a ferry crossing',
    ],
  },
  northLanarkshire: {
    region: 'North Lanarkshire',
    roads: ['M8', 'M73', 'M80', 'A8'],
    representativeNearby: ['Cumbernauld', 'Coatbridge', 'Airdrie', 'Wishaw'],
    contextLine:
      'North Lanarkshire commuting between the M8, M73 and M80 produces regular punctures, blowouts and kerb damage call outs.',
    callouts: [
      'flat tyre on the M8 east',
      'kerb damage in a residential street',
      'puncture on the M73',
      'late-night tyre call before a morning shift',
    ],
  },
  moray: {
    region: 'Moray',
    roads: ['A96', 'A95', 'A98', 'A941'],
    representativeNearby: ['Elgin', 'Forres', 'Buckie', 'Lossiemouth'],
    contextLine:
      'Moray driving covers coastal towns, A96 commuting and rural routes — tyre damage from verges and surface defects is a regular cause of call outs.',
    callouts: [
      'flat tyre on the A96',
      'puncture in a Moray town',
      'sidewall damage on a rural road',
      'tyre help in a coastal town',
    ],
  },
  orkney: {
    region: 'Orkney',
    roads: ['A964', 'A965', 'A961'],
    representativeNearby: ['Kirkwall', 'Stromness', 'St Margaret’s Hope'],
    contextLine:
      'Orkney roads are exposed to weather and have long stretches between towns. Mobile tyre help is part of our Scotland-wide cover — travel time to the islands is longer than the central belt, and we will be honest about timings before you commit.',
    callouts: [
      'flat tyre on an island road',
      'puncture in a small town',
      'sidewall damage from rough verges',
      'tyre help during cold weather',
    ],
  },
  shetland: {
    region: 'Shetland',
    roads: ['A970', 'A971', 'A968'],
    representativeNearby: ['Lerwick', 'Scalloway', 'Brae'],
    contextLine:
      'Shetland is one of the longer-reach areas for mobile tyre cover. We are honest about timings — Shetland is part of our Scotland-wide cover but island routes add real travel time.',
    callouts: [
      'flat tyre on a Shetland road',
      'puncture in Lerwick',
      'sidewall damage from rough verges',
      'tyre help during winter weather',
    ],
  },
  westernIsles: {
    region: 'Western Isles',
    roads: ['A859', 'A865', 'A858'],
    representativeNearby: ['Stornoway', 'Tarbert', 'Lochmaddy'],
    contextLine:
      'Western Isles routes are remote and weather-exposed. We will discuss honestly what mobile cover looks like for your location before you commit.',
    callouts: [
      'flat tyre on a remote road',
      'puncture near the main town',
      'sidewall damage on rough surfaces',
      'tyre help during winter',
    ],
  },
  perthKinross: {
    region: 'Perth & Kinross',
    roads: ['A9', 'M90', 'A85', 'A93'],
    representativeNearby: ['Perth', 'Kinross', 'Crieff', 'Pitlochry'],
    contextLine:
      'Perth & Kinross sits on the A9 corridor between central belt and Highland routes — punctures and blowouts on the A9 and M90 are regular call outs.',
    callouts: [
      'flat tyre on the A9',
      'puncture on the M90',
      'kerb damage in a town centre',
      'late-night tyre call on a Highland-edge route',
    ],
  },
  westDunbartonshire: {
    region: 'West Dunbartonshire',
    roads: ['A82', 'A814', 'A811', 'M898'],
    representativeNearby: ['Dumbarton', 'Clydebank', 'Alexandria', 'Balloch'],
    contextLine:
      'West Dunbartonshire driving runs from Clydebank along the A82 towards Loch Lomond — a busy mix of urban and Highland-edge tyre call outs.',
    callouts: [
      'flat tyre on the A82',
      'kerb damage in a residential street',
      'puncture heading to Loch Lomond',
      'tyre help in a Clydeside town',
    ],
  },
  eastDunbartonshire: {
    region: 'East Dunbartonshire',
    roads: ['A803', 'A809', 'A807', 'A81'],
    representativeNearby: ['Bishopbriggs', 'Kirkintilloch', 'Milngavie', 'Bearsden'],
    contextLine:
      'East Dunbartonshire suburbs and the canal-side routes north of Glasgow produce regular kerb damage and slow puncture call outs.',
    callouts: [
      'flat tyre on the driveway',
      'kerb damage in a suburban street',
      'puncture on the A803',
      'school-run tyre call out',
    ],
  },
  midlothian: {
    region: 'Midlothian',
    roads: ['A7', 'A720 bypass', 'A701', 'A772'],
    representativeNearby: ['Dalkeith', 'Penicuik', 'Bonnyrigg', 'Loanhead'],
    contextLine:
      'Midlothian commuting around the Edinburgh bypass produces a steady stream of kerb damage and puncture call outs.',
    callouts: [
      'flat tyre on the A720 bypass',
      'kerb damage in a town centre',
      'puncture on the A7 commute',
      'late-night tyre call before a shift',
    ],
  },
  westLothian: {
    region: 'West Lothian',
    roads: ['M8', 'M9', 'A89', 'A71'],
    representativeNearby: ['Livingston', 'Bathgate', 'Linlithgow', 'Broxburn'],
    contextLine:
      'West Lothian sits on the M8 between Glasgow and Edinburgh — high-traffic corridor where blowouts and punctures are regular call outs.',
    callouts: [
      'flat tyre on the M8',
      'kerb damage in town parking',
      'puncture on the M9',
      'late-night tyre call on the central belt',
    ],
  },
  eastLothian: {
    region: 'East Lothian',
    roads: ['A1', 'A199', 'A6093', 'A198'],
    representativeNearby: ['Haddington', 'Tranent', 'North Berwick', 'Dunbar'],
    contextLine:
      'East Lothian commuting on the A1 and coastal routes produces a regular mix of urban kerb damage and motorway-grade puncture call outs.',
    callouts: [
      'flat tyre on the A1',
      'kerb damage in a coastal town',
      'puncture on a rural East Lothian road',
      'tyre help on a coastal commute',
    ],
  },
  eastAyrshire: {
    region: 'East Ayrshire',
    roads: ['A71', 'A77', 'A76', 'A719'],
    representativeNearby: ['Kilmarnock', 'Cumnock', 'Stewarton', 'Galston'],
    contextLine:
      'East Ayrshire driving runs between Glasgow-bound commuting and rural routes — regular punctures and kerb damage call outs.',
    callouts: [
      'flat tyre on the A77 commute',
      'kerb damage in a town centre',
      'puncture on rural roads',
      'late-night tyre call before a shift',
    ],
  },
  southAyrshire: {
    region: 'South Ayrshire',
    roads: ['A77', 'A719', 'A70', 'A713'],
    representativeNearby: ['Ayr', 'Prestwick', 'Troon', 'Maybole'],
    contextLine:
      'South Ayrshire commuting on the A77 and coastal routes produces a steady mix of urban kerb damage and motorway-grade puncture call outs.',
    callouts: [
      'flat tyre on the A77',
      'kerb damage in coastal town parking',
      'puncture on the way to the airport',
      'late-night tyre call near the coast',
    ],
  },
  northAyrshire: {
    region: 'North Ayrshire',
    roads: ['A78', 'A737', 'A760', 'A841'],
    representativeNearby: ['Irvine', 'Kilwinning', 'Largs', 'Saltcoats'],
    contextLine:
      'North Ayrshire driving runs along the Clyde coast on the A78 and across to the M8 — regular punctures and kerb damage call outs.',
    callouts: [
      'flat tyre on the A78',
      'kerb damage in coastal parking',
      'puncture on the A737',
      'tyre help before a ferry crossing',
    ],
  },
  southLanarkshire: {
    region: 'South Lanarkshire',
    roads: ['M74', 'A726', 'A70', 'A71'],
    representativeNearby: ['Hamilton', 'East Kilbride', 'Lanark', 'Carluke'],
    contextLine:
      'South Lanarkshire commuting on the M74 corridor produces a regular mix of urban kerb damage and motorway-grade puncture call outs.',
    callouts: [
      'flat tyre on the M74',
      'kerb damage in a town centre',
      'puncture on the A726',
      'late-night tyre call before a morning shift',
    ],
  },
  fairer: {
    region: 'Falkirk',
    roads: ['M9', 'M80', 'A803', 'A904'],
    representativeNearby: ['Falkirk', 'Grangemouth', 'Bo’ness', 'Larbert'],
    contextLine:
      'Falkirk sits on the M9 / M80 corridor between Glasgow and Edinburgh — regular blowout, puncture and kerb damage call outs.',
    callouts: [
      'flat tyre on the M9',
      'kerb damage in town parking',
      'puncture on the M80',
      'late-night tyre call on the central belt',
    ],
  },
  clackmannanshire: {
    region: 'Clackmannanshire',
    roads: ['A91', 'A907', 'A977'],
    representativeNearby: ['Alloa', 'Tillicoultry', 'Clackmannan'],
    contextLine:
      'Clackmannanshire driving covers small-town and rural routes around the Forth Valley — regular puncture and kerb damage call outs.',
    callouts: [
      'flat tyre in a small town',
      'kerb damage in town parking',
      'puncture on the A91',
      'tyre help before a morning commute',
    ],
  },
};

const SERVICE_BUNDLE = [
  'mobile-tyre-fitting',
  'emergency-tyre-repair',
  '24-hour-mobile-tyre-fitting',
  'puncture-repair',
] as const;

interface CityEntry {
  slug: string;
  city: string;
  template: keyof typeof REGION_TEMPLATES;
  /** Override nearby slugs if the auto-pick would be poor. */
  nearby?: readonly string[];
}

/**
 * The 12 priority-1 hand-crafted location pages.
 */
const PRIORITY_ONE: readonly LocationPage[] = [
  {
    slug: 'glasgow',
    city: 'Glasgow',
    region: 'Glasgow & West',
    metaTitle: 'Mobile Tyre Fitting Glasgow | Same-Day & Out-of-Hours',
    metaDescription:
      'Mobile tyre fitting in Glasgow at home, work or roadside. Glasgow-based service covering G1, G2, G3, G31 and Greater Glasgow with day and night call outs.',
    heroTitle: 'Mobile tyre fitting in Glasgow',
    heroIntro:
      'Glasgow is our home base. We are a mobile tyre fitter operating from Unit 1, 10 Gateside Street in G31, and we cover G1, G2, G3 and the wider Glasgow postcode area for mobile tyre service across day, evening and night.',
    primaryKeywords: [
      'mobile tyre fitter Glasgow',
      'mobile tyre service G31',
      'mobile tyre fitter G1 G2 G3 Glasgow',
      'pothole damage tyre Glasgow',
      'late night tyre fitting Glasgow',
      'BMW mobile tyre fitter Glasgow',
    ],
    secondaryKeywords: [
      'emergency tyre Glasgow',
      'tyre callout Glasgow',
      'taxi tyre fitter mobile Glasgow',
    ],
    localContext:
      'Glasgow streets — from cobbles in the city centre to the M8 cutting through the middle — produce a constant mix of kerb damage, pothole punctures and blowouts. We dispatch from G31 and reach most of the city quickly, with longer journey times for the outer suburbs and during peak traffic.',
    roadContext: ['M8', 'M77', 'M74', 'M73', 'M80', 'A82', 'A726'],
    nearbyAreas: ['Paisley', 'East Kilbride', 'Hamilton', 'Bishopbriggs', 'Cumbernauld'],
    commonCallouts: [
      'flat tyre at home in a residential street',
      'pothole damage on a Glasgow main road',
      'kerb damage in a city centre car park',
      'puncture caught on the school run',
      'blowout on the M8 inside the city',
      'late-night tyre call before a morning shift',
    ],
    contentSections: [
      {
        heading: 'A Glasgow base, mobile across the city',
        body: [
          'We are not a national franchise — we are a Glasgow operation working out of Unit 1, 10 Gateside Street in G31. That means real local knowledge of the streets, the typical pothole hotspots, and the realistic travel times across the city.',
        ],
      },
      {
        heading: 'Pothole damage on Glasgow roads',
        body: [
          'Pothole strikes are one of the most common reasons for a tyre call out in Glasgow. Damage can show up as a slow puncture, sidewall bulge, or in the worst cases a complete blowout. Sidewall damage and bulges are not safely repairable — the tyre will need to be replaced.',
        ],
      },
      {
        heading: 'Out-of-hours service in Glasgow',
        body: [
          'Local garages largely close in the evening. The mobile service is built for the gap — late evenings, nights and Sundays, when most tyre shops are shut and drivers still need to be moving in the morning.',
        ],
      },
    ],
    faq: [
      {
        question: 'Do you cover all of Glasgow?',
        answer:
          'Yes — G1 to G77 and the surrounding postcode area, including the city centre, west end, south side, east end and outer suburbs. The Glasgow base means central-city call outs are typically faster than outer-suburb work.',
      },
      {
        question: 'Can you come out at night in Glasgow?',
        answer:
          'Yes — late-night, weekend and bank holiday call outs are part of the 24/7 mobile service. Pricing for unsocial hours is shown clearly in the quote before payment.',
      },
      {
        question: 'My tyre was damaged by a Glasgow pothole — can it be repaired?',
        answer:
          'It depends on the damage. Internal cord damage, sidewall bulges and blown sidewalls are not safely repairable. We will inspect the tyre and tell you honestly whether a repair is possible.',
      },
    ],
    relatedServices: [...SERVICE_BUNDLE, 'roadside-tyre-fitting', 'van-tyres'],
    nearbyLocationSlugs: ['paisley', 'east-kilbride', 'hamilton', 'bishopbriggs', 'cumbernauld'],
    priority: 1,
  },
  {
    slug: 'edinburgh',
    city: 'Edinburgh',
    region: 'Edinburgh & Lothians',
    metaTitle: 'Mobile Tyre Fitting Edinburgh | Out-of-Hours Tyre Help',
    metaDescription:
      'Mobile tyre fitting in Edinburgh at home, work or roadside. Full Lothians cover, day and night.',
    heroTitle: 'Mobile tyre fitting in Edinburgh',
    heroIntro:
      'We cover Edinburgh and the Lothians as part of our Scotland-wide mobile fleet — the M8 corridor gives realistic travel times to the capital. The service is built for kerb damage on the city’s cobbled streets, motorway debris on the bypass, and out-of-hours call outs that local garages cannot cover.',
    primaryKeywords: [
      'mobile tyre fitting Edinburgh',
      'tyre fitter tonight Edinburgh',
      'Audi mobile tyre fitter Edinburgh',
      'emergency tyre Edinburgh',
      'premium tyres mobile fitting Edinburgh',
    ],
    secondaryKeywords: [
      'mobile tyre fitter Glasgow',
      'tyre callout Edinburgh',
      'late night tyre fitting Edinburgh',
    ],
    localContext:
      'Edinburgh’s mix of cobbled city centre streets, the A720 city bypass, the M8 corridor west and the A1 south produces a steady stream of kerb damage and puncture call outs — many of which happen outside normal garage hours.',
    roadContext: ['M8', 'M9', 'A720 bypass', 'A1', 'A702', 'A8'],
    nearbyAreas: ['Leith', 'Musselburgh', 'Livingston', 'Dalkeith', 'Penicuik'],
    commonCallouts: [
      'kerb damage on a cobbled city centre street',
      'puncture during the A720 bypass commute',
      'late-night flat in an Edinburgh suburb',
      'blowout on the M8 heading west',
      'tyre damage on the A1 heading south',
      'school-run flat tyre',
    ],
    contentSections: [
      {
        heading: 'Edinburgh tyre call outs we see most often',
        body: [
          'Cobbled streets in the city centre are tough on tyres and wheels. Bypass traffic on the A720 produces a steady stream of motorway-grade punctures, and many drivers call after work when local tyre shops are closing.',
        ],
      },
      {
        heading: 'Premium and run flat fitting in Edinburgh',
        body: [
          'Run flat tyres on BMW, Mini and similar are a regular call in Edinburgh. Once a run flat has supported the vehicle after pressure loss, the structure is compromised and replacement is the safe option.',
        ],
      },
    ],
    faq: [
      {
        question: 'Do you actually cover Edinburgh?',
        answer:
          'Yes — the M8 corridor is a regular run for us. Travel times are honest: longer than a Glasgow call out, but we will quote and confirm before you commit.',
      },
      {
        question: 'Can you fit run flat tyres in Edinburgh?',
        answer:
          'Yes — common BMW, Mini and Audi run flat sizes are stocked or sourced quickly.',
      },
    ],
    relatedServices: [...SERVICE_BUNDLE, 'run-flat-tyres', 'roadside-tyre-fitting'],
    nearbyLocationSlugs: ['livingston', 'dalkeith', 'musselburgh', 'penicuik', 'haddington'],
    priority: 1,
  },
];

interface SimpleP1Spec {
  slug: string;
  city: string;
  region: string;
  template: keyof typeof REGION_TEMPLATES;
  primary: readonly string[];
  nearbySlugs: readonly string[];
}

const SIMPLE_PRIORITY_ONE: readonly SimpleP1Spec[] = [
  {
    slug: 'aberdeen',
    city: 'Aberdeen',
    region: 'Aberdeen & Aberdeenshire',
    template: 'aberdeen',
    primary: [
      'mobile tyre fitting Aberdeen',
      'emergency tyre Aberdeen',
      'late night tyre fitter Aberdeen',
    ],
    nearbySlugs: ['dyce', 'westhill', 'stonehaven', 'inverurie', 'peterhead'],
  },
  {
    slug: 'dundee',
    city: 'Dundee',
    region: 'Dundee & Angus',
    template: 'dundee',
    primary: ['mobile tyre fitting Dundee', 'emergency tyre Dundee', 'tyre fitter tonight Dundee'],
    nearbySlugs: ['broughty-ferry', 'carnoustie', 'forfar', 'arbroath', 'monifieth'],
  },
  {
    slug: 'inverness',
    city: 'Inverness',
    region: 'Highlands',
    template: 'highlands',
    primary: [
      'mobile tyre fitter Inverness',
      'emergency tyre Inverness',
      'tyre help on A9',
    ],
    nearbySlugs: ['nairn', 'aviemore', 'fort-william', 'dingwall', 'beauly'],
  },
  {
    slug: 'paisley',
    city: 'Paisley',
    region: 'Renfrewshire',
    template: 'renfrewshire',
    primary: ['mobile tyre fitting Paisley', 'emergency tyre Paisley'],
    nearbySlugs: ['renfrew', 'johnstone', 'erskine', 'glasgow', 'bishopton'],
  },
  {
    slug: 'east-kilbride',
    city: 'East Kilbride',
    region: 'South Lanarkshire',
    template: 'lanarkshire',
    primary: ['mobile tyre fitting East Kilbride', 'emergency tyre East Kilbride'],
    nearbySlugs: ['hamilton', 'glasgow', 'rutherglen', 'newton-mearns', 'eaglesham'],
  },
  {
    slug: 'hamilton',
    city: 'Hamilton',
    region: 'South Lanarkshire',
    template: 'lanarkshire',
    primary: ['mobile tyre fitting Hamilton', 'emergency tyre Hamilton'],
    nearbySlugs: ['motherwell', 'east-kilbride', 'wishaw', 'larkhall', 'glasgow'],
  },
  {
    slug: 'falkirk',
    city: 'Falkirk',
    region: 'Falkirk',
    template: 'fairer',
    primary: ['mobile tyre fitting Falkirk', 'emergency tyre Falkirk'],
    nearbySlugs: ['grangemouth', 'larbert', 'bo-ness', 'stirling', 'cumbernauld'],
  },
  {
    slug: 'stirling',
    city: 'Stirling',
    region: 'Stirling & Forth Valley',
    template: 'stirlingForth',
    primary: ['mobile tyre fitting Stirling', 'emergency tyre Stirling'],
    nearbySlugs: ['bridge-of-allan', 'dunblane', 'falkirk', 'alloa', 'callander'],
  },
  {
    slug: 'perth',
    city: 'Perth',
    region: 'Perth & Kinross',
    template: 'perthKinross',
    primary: ['mobile tyre fitting Perth', 'emergency tyre Perth'],
    nearbySlugs: ['kinross', 'crieff', 'pitlochry', 'auchterarder', 'blairgowrie'],
  },
  {
    slug: 'livingston',
    city: 'Livingston',
    region: 'West Lothian',
    template: 'westLothian',
    primary: ['mobile tyre fitting Livingston', 'emergency tyre Livingston'],
    nearbySlugs: ['bathgate', 'broxburn', 'linlithgow', 'edinburgh', 'whitburn'],
  },
];

function buildSimplePriorityOnePages(): readonly LocationPage[] {
  return SIMPLE_PRIORITY_ONE.map((spec) => buildLocationPageFromTemplate(spec, 1));
}
// Re-exported for callers that want the hand-crafted P1 + templated P1 split.
export { buildSimplePriorityOnePages };

interface PriorityTwoSpec {
  slug: string;
  city: string;
  template: keyof typeof REGION_TEMPLATES;
  nearbySlugs?: readonly string[];
}

const PRIORITY_TWO_SPECS: readonly PriorityTwoSpec[] = [
  { slug: 'motherwell', city: 'Motherwell', template: 'lanarkshire' },
  { slug: 'wishaw', city: 'Wishaw', template: 'lanarkshire' },
  { slug: 'cumbernauld', city: 'Cumbernauld', template: 'northLanarkshire' },
  { slug: 'coatbridge', city: 'Coatbridge', template: 'northLanarkshire' },
  { slug: 'airdrie', city: 'Airdrie', template: 'northLanarkshire' },
  { slug: 'kilmarnock', city: 'Kilmarnock', template: 'eastAyrshire' },
  { slug: 'ayr', city: 'Ayr', template: 'southAyrshire' },
  { slug: 'irvine', city: 'Irvine', template: 'northAyrshire' },
  { slug: 'kirkcaldy', city: 'Kirkcaldy', template: 'fife' },
  { slug: 'dunfermline', city: 'Dunfermline', template: 'fife' },
  { slug: 'glenrothes', city: 'Glenrothes', template: 'fife' },
  { slug: 'st-andrews', city: 'St Andrews', template: 'fife' },
  { slug: 'fort-william', city: 'Fort William', template: 'highlands' },
  { slug: 'oban', city: 'Oban', template: 'argyllBute' },
  { slug: 'helensburgh', city: 'Helensburgh', template: 'argyllBute' },
  { slug: 'dumfries', city: 'Dumfries', template: 'dumfries' },
  { slug: 'galashiels', city: 'Galashiels', template: 'borders' },
  { slug: 'elgin', city: 'Elgin', template: 'moray' },
  { slug: 'greenock', city: 'Greenock', template: 'inverclyde' },
  { slug: 'bishopbriggs', city: 'Bishopbriggs', template: 'eastDunbartonshire' },
];

const PRIORITY_TWO: readonly LocationPage[] = PRIORITY_TWO_SPECS.map((spec) =>
  buildLocationPageFromTemplate(
    {
      slug: spec.slug,
      city: spec.city,
      region: REGION_TEMPLATES[spec.template]!.region,
      template: spec.template,
      primary: [
        `mobile tyre fitting ${spec.city}`,
        `emergency tyre ${spec.city}`,
        `tyre fitter near ${spec.city}`,
      ],
      nearbySlugs: spec.nearbySlugs ?? [],
    },
    2,
  ),
);

/* ---------------------------------------------------------------- */
/*  Priority-3 master list — 333 Scottish towns by region           */
/* ---------------------------------------------------------------- */

const EXTRA_TOWNS: readonly CityEntry[] = [
  // Glasgow & West / Greater Glasgow
  { slug: 'rutherglen', city: 'Rutherglen', template: 'glasgowWest' },
  { slug: 'cambuslang', city: 'Cambuslang', template: 'glasgowWest' },
  { slug: 'newton-mearns', city: 'Newton Mearns', template: 'glasgowWest' },
  { slug: 'giffnock', city: 'Giffnock', template: 'glasgowWest' },
  { slug: 'clarkston', city: 'Clarkston', template: 'glasgowWest' },
  { slug: 'thornliebank', city: 'Thornliebank', template: 'glasgowWest' },
  { slug: 'pollokshaws', city: 'Pollokshaws', template: 'glasgowWest' },
  { slug: 'shawlands', city: 'Shawlands', template: 'glasgowWest' },
  { slug: 'govan', city: 'Govan', template: 'glasgowWest' },
  { slug: 'partick', city: 'Partick', template: 'glasgowWest' },
  { slug: 'maryhill', city: 'Maryhill', template: 'glasgowWest' },
  { slug: 'springburn', city: 'Springburn', template: 'glasgowWest' },
  { slug: 'parkhead', city: 'Parkhead', template: 'glasgowWest' },
  { slug: 'shettleston', city: 'Shettleston', template: 'glasgowWest' },
  { slug: 'tollcross', city: 'Tollcross', template: 'glasgowWest' },
  { slug: 'baillieston', city: 'Baillieston', template: 'glasgowWest' },
  { slug: 'easterhouse', city: 'Easterhouse', template: 'glasgowWest' },
  { slug: 'castlemilk', city: 'Castlemilk', template: 'glasgowWest' },
  { slug: 'pollok', city: 'Pollok', template: 'glasgowWest' },
  { slug: 'crookston', city: 'Crookston', template: 'glasgowWest' },
  { slug: 'cardonald', city: 'Cardonald', template: 'glasgowWest' },
  { slug: 'mosspark', city: 'Mosspark', template: 'glasgowWest' },
  { slug: 'hillington', city: 'Hillington', template: 'glasgowWest' },
  { slug: 'penilee', city: 'Penilee', template: 'glasgowWest' },
  { slug: 'eaglesham', city: 'Eaglesham', template: 'glasgowWest' },
  { slug: 'busby', city: 'Busby', template: 'glasgowWest' },
  { slug: 'mearnskirk', city: 'Mearnskirk', template: 'glasgowWest' },
  { slug: 'thorntonhall', city: 'Thorntonhall', template: 'glasgowWest' },
  { slug: 'jordanhill', city: 'Jordanhill', template: 'glasgowWest' },
  { slug: 'knightswood', city: 'Knightswood', template: 'glasgowWest' },
  { slug: 'anniesland', city: 'Anniesland', template: 'glasgowWest' },
  { slug: 'scotstoun', city: 'Scotstoun', template: 'glasgowWest' },
  { slug: 'yoker', city: 'Yoker', template: 'glasgowWest' },
  { slug: 'drumchapel', city: 'Drumchapel', template: 'glasgowWest' },
  { slug: 'milton-glasgow', city: 'Milton (Glasgow)', template: 'glasgowWest' },
  { slug: 'possilpark', city: 'Possilpark', template: 'glasgowWest' },
  { slug: 'ruchill', city: 'Ruchill', template: 'glasgowWest' },
  { slug: 'lambhill', city: 'Lambhill', template: 'glasgowWest' },

  // Renfrewshire
  { slug: 'renfrew', city: 'Renfrew', template: 'renfrewshire' },
  { slug: 'johnstone', city: 'Johnstone', template: 'renfrewshire' },
  { slug: 'erskine', city: 'Erskine', template: 'renfrewshire' },
  { slug: 'bishopton', city: 'Bishopton', template: 'renfrewshire' },
  { slug: 'linwood', city: 'Linwood', template: 'renfrewshire' },
  { slug: 'elderslie', city: 'Elderslie', template: 'renfrewshire' },
  { slug: 'houston-renfrewshire', city: 'Houston', template: 'renfrewshire' },
  { slug: 'bridge-of-weir', city: 'Bridge of Weir', template: 'renfrewshire' },
  { slug: 'kilbarchan', city: 'Kilbarchan', template: 'renfrewshire' },
  { slug: 'lochwinnoch', city: 'Lochwinnoch', template: 'renfrewshire' },
  { slug: 'howwood', city: 'Howwood', template: 'renfrewshire' },
  { slug: 'inchinnan', city: 'Inchinnan', template: 'renfrewshire' },

  // Inverclyde
  { slug: 'port-glasgow', city: 'Port Glasgow', template: 'inverclyde' },
  { slug: 'gourock', city: 'Gourock', template: 'inverclyde' },
  { slug: 'kilmacolm', city: 'Kilmacolm', template: 'inverclyde' },
  { slug: 'wemyss-bay', city: 'Wemyss Bay', template: 'inverclyde' },
  { slug: 'inverkip', city: 'Inverkip', template: 'inverclyde' },
  { slug: 'skelmorlie', city: 'Skelmorlie', template: 'inverclyde' },

  // West Dunbartonshire
  { slug: 'clydebank', city: 'Clydebank', template: 'westDunbartonshire' },
  { slug: 'dumbarton', city: 'Dumbarton', template: 'westDunbartonshire' },
  { slug: 'alexandria', city: 'Alexandria', template: 'westDunbartonshire' },
  { slug: 'balloch', city: 'Balloch', template: 'westDunbartonshire' },
  { slug: 'old-kilpatrick', city: 'Old Kilpatrick', template: 'westDunbartonshire' },
  { slug: 'bowling', city: 'Bowling', template: 'westDunbartonshire' },
  { slug: 'milton-west-dun', city: 'Milton (Dunbartonshire)', template: 'westDunbartonshire' },
  { slug: 'duntocher', city: 'Duntocher', template: 'westDunbartonshire' },

  // East Dunbartonshire
  { slug: 'kirkintilloch', city: 'Kirkintilloch', template: 'eastDunbartonshire' },
  { slug: 'bearsden', city: 'Bearsden', template: 'eastDunbartonshire' },
  { slug: 'milngavie', city: 'Milngavie', template: 'eastDunbartonshire' },
  { slug: 'lenzie', city: 'Lenzie', template: 'eastDunbartonshire' },
  { slug: 'torrance', city: 'Torrance', template: 'eastDunbartonshire' },
  { slug: 'twechar', city: 'Twechar', template: 'eastDunbartonshire' },
  { slug: 'milton-of-campsie', city: 'Milton of Campsie', template: 'eastDunbartonshire' },
  { slug: 'lennoxtown', city: 'Lennoxtown', template: 'eastDunbartonshire' },

  // North Lanarkshire
  { slug: 'bellshill', city: 'Bellshill', template: 'northLanarkshire' },
  { slug: 'shotts', city: 'Shotts', template: 'northLanarkshire' },
  { slug: 'kilsyth', city: 'Kilsyth', template: 'northLanarkshire' },
  { slug: 'moodiesburn', city: 'Moodiesburn', template: 'northLanarkshire' },
  { slug: 'chryston', city: 'Chryston', template: 'northLanarkshire' },
  { slug: 'stepps', city: 'Stepps', template: 'northLanarkshire' },
  { slug: 'gartcosh', city: 'Gartcosh', template: 'northLanarkshire' },
  { slug: 'muirhead', city: 'Muirhead', template: 'northLanarkshire' },
  { slug: 'condorrat', city: 'Condorrat', template: 'northLanarkshire' },
  { slug: 'newarthill', city: 'Newarthill', template: 'northLanarkshire' },
  { slug: 'newmains', city: 'Newmains', template: 'northLanarkshire' },
  { slug: 'cleland', city: 'Cleland', template: 'northLanarkshire' },
  { slug: 'salsburgh', city: 'Salsburgh', template: 'northLanarkshire' },
  { slug: 'plains', city: 'Plains', template: 'northLanarkshire' },
  { slug: 'caldercruix', city: 'Caldercruix', template: 'northLanarkshire' },

  // South Lanarkshire
  { slug: 'larkhall', city: 'Larkhall', template: 'lanarkshire' },
  { slug: 'carluke', city: 'Carluke', template: 'lanarkshire' },
  { slug: 'lanark', city: 'Lanark', template: 'lanarkshire' },
  { slug: 'biggar', city: 'Biggar', template: 'lanarkshire' },
  { slug: 'strathaven', city: 'Strathaven', template: 'lanarkshire' },
  { slug: 'lesmahagow', city: 'Lesmahagow', template: 'lanarkshire' },
  { slug: 'forth', city: 'Forth', template: 'lanarkshire' },
  { slug: 'douglas', city: 'Douglas', template: 'lanarkshire' },
  { slug: 'leadhills', city: 'Leadhills', template: 'lanarkshire' },
  { slug: 'wanlockhead', city: 'Wanlockhead', template: 'lanarkshire' },
  { slug: 'crawford', city: 'Crawford', template: 'lanarkshire' },
  { slug: 'abington', city: 'Abington', template: 'lanarkshire' },
  { slug: 'symington-south-lan', city: 'Symington', template: 'lanarkshire' },
  { slug: 'blackwood', city: 'Blackwood', template: 'lanarkshire' },
  { slug: 'kirkmuirhill', city: 'Kirkmuirhill', template: 'lanarkshire' },
  { slug: 'blantyre', city: 'Blantyre', template: 'lanarkshire' },
  { slug: 'uddingston', city: 'Uddingston', template: 'lanarkshire' },
  { slug: 'bothwell', city: 'Bothwell', template: 'lanarkshire' },

  // East Ayrshire
  { slug: 'cumnock', city: 'Cumnock', template: 'eastAyrshire' },
  { slug: 'galston', city: 'Galston', template: 'eastAyrshire' },
  { slug: 'stewarton', city: 'Stewarton', template: 'eastAyrshire' },
  { slug: 'kilmaurs', city: 'Kilmaurs', template: 'eastAyrshire' },
  { slug: 'hurlford', city: 'Hurlford', template: 'eastAyrshire' },
  { slug: 'mauchline', city: 'Mauchline', template: 'eastAyrshire' },
  { slug: 'newmilns', city: 'Newmilns', template: 'eastAyrshire' },
  { slug: 'darvel', city: 'Darvel', template: 'eastAyrshire' },
  { slug: 'auchinleck', city: 'Auchinleck', template: 'eastAyrshire' },
  { slug: 'ochiltree', city: 'Ochiltree', template: 'eastAyrshire' },
  { slug: 'catrine', city: 'Catrine', template: 'eastAyrshire' },
  { slug: 'patna', city: 'Patna', template: 'eastAyrshire' },
  { slug: 'dalmellington', city: 'Dalmellington', template: 'eastAyrshire' },

  // South Ayrshire
  { slug: 'prestwick', city: 'Prestwick', template: 'southAyrshire' },
  { slug: 'troon', city: 'Troon', template: 'southAyrshire' },
  { slug: 'maybole', city: 'Maybole', template: 'southAyrshire' },
  { slug: 'girvan', city: 'Girvan', template: 'southAyrshire' },
  { slug: 'ballantrae', city: 'Ballantrae', template: 'southAyrshire' },
  { slug: 'dailly', city: 'Dailly', template: 'southAyrshire' },
  { slug: 'crosshill', city: 'Crosshill', template: 'southAyrshire' },
  { slug: 'turnberry', city: 'Turnberry', template: 'southAyrshire' },
  { slug: 'monkton', city: 'Monkton', template: 'southAyrshire' },
  { slug: 'symington-south-ayr', city: 'Symington (Ayr)', template: 'southAyrshire' },
  { slug: 'tarbolton', city: 'Tarbolton', template: 'southAyrshire' },
  { slug: 'mossblown', city: 'Mossblown', template: 'southAyrshire' },

  // North Ayrshire
  { slug: 'kilwinning', city: 'Kilwinning', template: 'northAyrshire' },
  { slug: 'largs', city: 'Largs', template: 'northAyrshire' },
  { slug: 'saltcoats', city: 'Saltcoats', template: 'northAyrshire' },
  { slug: 'stevenston', city: 'Stevenston', template: 'northAyrshire' },
  { slug: 'ardrossan', city: 'Ardrossan', template: 'northAyrshire' },
  { slug: 'west-kilbride', city: 'West Kilbride', template: 'northAyrshire' },
  { slug: 'fairlie', city: 'Fairlie', template: 'northAyrshire' },
  { slug: 'beith', city: 'Beith', template: 'northAyrshire' },
  { slug: 'dalry-ayrshire', city: 'Dalry (Ayrshire)', template: 'northAyrshire' },
  { slug: 'kilbirnie', city: 'Kilbirnie', template: 'northAyrshire' },
  { slug: 'millport', city: 'Millport', template: 'northAyrshire' },
  { slug: 'brodick', city: 'Brodick', template: 'northAyrshire' },
  { slug: 'lamlash', city: 'Lamlash', template: 'northAyrshire' },

  // Falkirk
  { slug: 'grangemouth', city: 'Grangemouth', template: 'fairer' },
  { slug: 'larbert', city: 'Larbert', template: 'fairer' },
  { slug: 'bo-ness', city: 'Bo’ness', template: 'fairer' },
  { slug: 'denny', city: 'Denny', template: 'fairer' },
  { slug: 'bonnybridge', city: 'Bonnybridge', template: 'fairer' },
  { slug: 'polmont', city: 'Polmont', template: 'fairer' },
  { slug: 'stenhousemuir', city: 'Stenhousemuir', template: 'fairer' },
  { slug: 'maddiston', city: 'Maddiston', template: 'fairer' },
  { slug: 'california-falkirk', city: 'California', template: 'fairer' },
  { slug: 'avonbridge', city: 'Avonbridge', template: 'fairer' },

  // Stirling
  { slug: 'bridge-of-allan', city: 'Bridge of Allan', template: 'stirlingForth' },
  { slug: 'dunblane', city: 'Dunblane', template: 'stirlingForth' },
  { slug: 'callander', city: 'Callander', template: 'stirlingForth' },
  { slug: 'killin', city: 'Killin', template: 'stirlingForth' },
  { slug: 'aberfoyle', city: 'Aberfoyle', template: 'stirlingForth' },
  { slug: 'doune', city: 'Doune', template: 'stirlingForth' },
  { slug: 'balfron', city: 'Balfron', template: 'stirlingForth' },
  { slug: 'killearn', city: 'Killearn', template: 'stirlingForth' },
  { slug: 'drymen', city: 'Drymen', template: 'stirlingForth' },
  { slug: 'tyndrum', city: 'Tyndrum', template: 'stirlingForth' },
  { slug: 'crianlarich', city: 'Crianlarich', template: 'stirlingForth' },

  // Clackmannanshire
  { slug: 'alloa', city: 'Alloa', template: 'clackmannanshire' },
  { slug: 'tillicoultry', city: 'Tillicoultry', template: 'clackmannanshire' },
  { slug: 'clackmannan', city: 'Clackmannan', template: 'clackmannanshire' },
  { slug: 'sauchie', city: 'Sauchie', template: 'clackmannanshire' },
  { slug: 'tullibody', city: 'Tullibody', template: 'clackmannanshire' },
  { slug: 'alva', city: 'Alva', template: 'clackmannanshire' },
  { slug: 'menstrie', city: 'Menstrie', template: 'clackmannanshire' },
  { slug: 'dollar', city: 'Dollar', template: 'clackmannanshire' },

  // Fife
  { slug: 'leven', city: 'Leven', template: 'fife' },
  { slug: 'methil', city: 'Methil', template: 'fife' },
  { slug: 'cupar', city: 'Cupar', template: 'fife' },
  { slug: 'anstruther', city: 'Anstruther', template: 'fife' },
  { slug: 'crail', city: 'Crail', template: 'fife' },
  { slug: 'pittenweem', city: 'Pittenweem', template: 'fife' },
  { slug: 'st-monans', city: 'St Monans', template: 'fife' },
  { slug: 'elie', city: 'Elie', template: 'fife' },
  { slug: 'lundin-links', city: 'Lundin Links', template: 'fife' },
  { slug: 'buckhaven', city: 'Buckhaven', template: 'fife' },
  { slug: 'kennoway', city: 'Kennoway', template: 'fife' },
  { slug: 'markinch', city: 'Markinch', template: 'fife' },
  { slug: 'leslie', city: 'Leslie', template: 'fife' },
  { slug: 'kinglassie', city: 'Kinglassie', template: 'fife' },
  { slug: 'cardenden', city: 'Cardenden', template: 'fife' },
  { slug: 'lochgelly', city: 'Lochgelly', template: 'fife' },
  { slug: 'cowdenbeath', city: 'Cowdenbeath', template: 'fife' },
  { slug: 'kelty', city: 'Kelty', template: 'fife' },
  { slug: 'crossgates', city: 'Crossgates', template: 'fife' },
  { slug: 'inverkeithing', city: 'Inverkeithing', template: 'fife' },
  { slug: 'rosyth', city: 'Rosyth', template: 'fife' },
  { slug: 'dalgety-bay', city: 'Dalgety Bay', template: 'fife' },
  { slug: 'aberdour', city: 'Aberdour', template: 'fife' },
  { slug: 'burntisland', city: 'Burntisland', template: 'fife' },
  { slug: 'kinghorn', city: 'Kinghorn', template: 'fife' },
  { slug: 'lochore', city: 'Lochore', template: 'fife' },
  { slug: 'auchtermuchty', city: 'Auchtermuchty', template: 'fife' },
  { slug: 'newburgh-fife', city: 'Newburgh', template: 'fife' },
  { slug: 'falkland', city: 'Falkland', template: 'fife' },
  { slug: 'tayport', city: 'Tayport', template: 'fife' },
  { slug: 'newport-on-tay', city: 'Newport-on-Tay', template: 'fife' },

  // Perth & Kinross
  { slug: 'kinross', city: 'Kinross', template: 'perthKinross' },
  { slug: 'crieff', city: 'Crieff', template: 'perthKinross' },
  { slug: 'pitlochry', city: 'Pitlochry', template: 'perthKinross' },
  { slug: 'auchterarder', city: 'Auchterarder', template: 'perthKinross' },
  { slug: 'blairgowrie', city: 'Blairgowrie', template: 'perthKinross' },
  { slug: 'aberfeldy', city: 'Aberfeldy', template: 'perthKinross' },
  { slug: 'dunkeld', city: 'Dunkeld', template: 'perthKinross' },
  { slug: 'birnam', city: 'Birnam', template: 'perthKinross' },
  { slug: 'comrie', city: 'Comrie', template: 'perthKinross' },
  { slug: 'methven', city: 'Methven', template: 'perthKinross' },
  { slug: 'scone', city: 'Scone', template: 'perthKinross' },
  { slug: 'bridge-of-earn', city: 'Bridge of Earn', template: 'perthKinross' },
  { slug: 'milnathort', city: 'Milnathort', template: 'perthKinross' },
  { slug: 'kenmore', city: 'Kenmore', template: 'perthKinross' },
  { slug: 'killiecrankie', city: 'Killiecrankie', template: 'perthKinross' },
  { slug: 'dunning', city: 'Dunning', template: 'perthKinross' },
  { slug: 'rattray', city: 'Rattray', template: 'perthKinross' },
  { slug: 'errol', city: 'Errol', template: 'perthKinross' },
  { slug: 'coupar-angus', city: 'Coupar Angus', template: 'perthKinross' },
  { slug: 'alyth', city: 'Alyth', template: 'perthKinross' },

  // Angus
  { slug: 'arbroath', city: 'Arbroath', template: 'dundee' },
  { slug: 'forfar', city: 'Forfar', template: 'dundee' },
  { slug: 'carnoustie', city: 'Carnoustie', template: 'dundee' },
  { slug: 'broughty-ferry', city: 'Broughty Ferry', template: 'dundee' },
  { slug: 'monifieth', city: 'Monifieth', template: 'dundee' },
  { slug: 'montrose', city: 'Montrose', template: 'dundee' },
  { slug: 'brechin', city: 'Brechin', template: 'dundee' },
  { slug: 'kirriemuir', city: 'Kirriemuir', template: 'dundee' },
  { slug: 'edzell', city: 'Edzell', template: 'dundee' },
  { slug: 'friockheim', city: 'Friockheim', template: 'dundee' },
  { slug: 'glamis', city: 'Glamis', template: 'dundee' },
  { slug: 'tannadice', city: 'Tannadice', template: 'dundee' },

  // Aberdeen / Aberdeenshire / Moray
  { slug: 'dyce', city: 'Dyce', template: 'aberdeen' },
  { slug: 'westhill', city: 'Westhill', template: 'aberdeen' },
  { slug: 'stonehaven', city: 'Stonehaven', template: 'aberdeen' },
  { slug: 'inverurie', city: 'Inverurie', template: 'aberdeen' },
  { slug: 'peterhead', city: 'Peterhead', template: 'aberdeen' },
  { slug: 'fraserburgh', city: 'Fraserburgh', template: 'aberdeen' },
  { slug: 'banchory', city: 'Banchory', template: 'aberdeen' },
  { slug: 'ellon', city: 'Ellon', template: 'aberdeen' },
  { slug: 'kintore', city: 'Kintore', template: 'aberdeen' },
  { slug: 'oldmeldrum', city: 'Oldmeldrum', template: 'aberdeen' },
  { slug: 'turriff', city: 'Turriff', template: 'aberdeen' },
  { slug: 'huntly', city: 'Huntly', template: 'aberdeen' },
  { slug: 'banff', city: 'Banff', template: 'aberdeen' },
  { slug: 'macduff', city: 'Macduff', template: 'aberdeen' },
  { slug: 'portsoy', city: 'Portsoy', template: 'aberdeen' },
  { slug: 'cullen', city: 'Cullen', template: 'aberdeen' },
  { slug: 'aboyne', city: 'Aboyne', template: 'aberdeen' },
  { slug: 'ballater', city: 'Ballater', template: 'aberdeen' },
  { slug: 'braemar', city: 'Braemar', template: 'aberdeen' },
  { slug: 'mintlaw', city: 'Mintlaw', template: 'aberdeen' },
  { slug: 'maud', city: 'Maud', template: 'aberdeen' },
  { slug: 'newmachar', city: 'Newmachar', template: 'aberdeen' },
  { slug: 'forres', city: 'Forres', template: 'moray' },
  { slug: 'buckie', city: 'Buckie', template: 'moray' },
  { slug: 'lossiemouth', city: 'Lossiemouth', template: 'moray' },
  { slug: 'keith', city: 'Keith', template: 'moray' },
  { slug: 'aberlour', city: 'Aberlour', template: 'moray' },
  { slug: 'fochabers', city: 'Fochabers', template: 'moray' },
  { slug: 'rothes', city: 'Rothes', template: 'moray' },
  { slug: 'dufftown', city: 'Dufftown', template: 'moray' },
  { slug: 'tomintoul', city: 'Tomintoul', template: 'moray' },
  { slug: 'craigellachie', city: 'Craigellachie', template: 'moray' },
  { slug: 'burghead', city: 'Burghead', template: 'moray' },
  { slug: 'hopeman', city: 'Hopeman', template: 'moray' },

  // Highlands
  { slug: 'nairn', city: 'Nairn', template: 'highlands' },
  { slug: 'aviemore', city: 'Aviemore', template: 'highlands' },
  { slug: 'dingwall', city: 'Dingwall', template: 'highlands' },
  { slug: 'beauly', city: 'Beauly', template: 'highlands' },
  { slug: 'tain', city: 'Tain', template: 'highlands' },
  { slug: 'invergordon', city: 'Invergordon', template: 'highlands' },
  { slug: 'alness', city: 'Alness', template: 'highlands' },
  { slug: 'wick', city: 'Wick', template: 'highlands' },
  { slug: 'thurso', city: 'Thurso', template: 'highlands' },
  { slug: 'helmsdale', city: 'Helmsdale', template: 'highlands' },
  { slug: 'brora', city: 'Brora', template: 'highlands' },
  { slug: 'golspie', city: 'Golspie', template: 'highlands' },
  { slug: 'dornoch', city: 'Dornoch', template: 'highlands' },
  { slug: 'lairg', city: 'Lairg', template: 'highlands' },
  { slug: 'ullapool', city: 'Ullapool', template: 'highlands' },
  { slug: 'gairloch', city: 'Gairloch', template: 'highlands' },
  { slug: 'kingussie', city: 'Kingussie', template: 'highlands' },
  { slug: 'newtonmore', city: 'Newtonmore', template: 'highlands' },
  { slug: 'grantown-on-spey', city: 'Grantown-on-Spey', template: 'highlands' },
  { slug: 'carrbridge', city: 'Carrbridge', template: 'highlands' },
  { slug: 'mallaig', city: 'Mallaig', template: 'highlands' },
  { slug: 'kyle-of-lochalsh', city: 'Kyle of Lochalsh', template: 'highlands' },
  { slug: 'plockton', city: 'Plockton', template: 'highlands' },
  { slug: 'portree', city: 'Portree', template: 'highlands' },
  { slug: 'broadford', city: 'Broadford', template: 'highlands' },
  { slug: 'dunvegan', city: 'Dunvegan', template: 'highlands' },
  { slug: 'uig-skye', city: 'Uig (Skye)', template: 'highlands' },
  { slug: 'glenfinnan', city: 'Glenfinnan', template: 'highlands' },
  { slug: 'spean-bridge', city: 'Spean Bridge', template: 'highlands' },
  { slug: 'fort-augustus', city: 'Fort Augustus', template: 'highlands' },
  { slug: 'drumnadrochit', city: 'Drumnadrochit', template: 'highlands' },
  { slug: 'cromarty', city: 'Cromarty', template: 'highlands' },
  { slug: 'fortrose', city: 'Fortrose', template: 'highlands' },
  { slug: 'munlochy', city: 'Munlochy', template: 'highlands' },
  { slug: 'culloden', city: 'Culloden', template: 'highlands' },
  { slug: 'ardersier', city: 'Ardersier', template: 'highlands' },
  { slug: 'foyers', city: 'Foyers', template: 'highlands' },
  { slug: 'achiltibuie', city: 'Achiltibuie', template: 'highlands' },
  { slug: 'lochinver', city: 'Lochinver', template: 'highlands' },
  { slug: 'durness', city: 'Durness', template: 'highlands' },
  { slug: 'tongue', city: 'Tongue', template: 'highlands' },
  { slug: 'bettyhill', city: 'Bettyhill', template: 'highlands' },

  // Argyll & Bute
  { slug: 'lochgilphead', city: 'Lochgilphead', template: 'argyllBute' },
  { slug: 'inveraray', city: 'Inveraray', template: 'argyllBute' },
  { slug: 'campbeltown', city: 'Campbeltown', template: 'argyllBute' },
  { slug: 'tarbert-argyll', city: 'Tarbert (Argyll)', template: 'argyllBute' },
  { slug: 'tobermory', city: 'Tobermory', template: 'argyllBute' },
  { slug: 'craignure', city: 'Craignure', template: 'argyllBute' },
  { slug: 'dunoon', city: 'Dunoon', template: 'argyllBute' },
  { slug: 'rothesay', city: 'Rothesay', template: 'argyllBute' },
  { slug: 'cardross', city: 'Cardross', template: 'argyllBute' },
  { slug: 'rhu', city: 'Rhu', template: 'argyllBute' },
  { slug: 'arrochar', city: 'Arrochar', template: 'argyllBute' },
  { slug: 'tarbet-loch-lomond', city: 'Tarbet (Loch Lomond)', template: 'argyllBute' },
  { slug: 'ardrishaig', city: 'Ardrishaig', template: 'argyllBute' },
  { slug: 'crinan', city: 'Crinan', template: 'argyllBute' },
  { slug: 'kilmartin', city: 'Kilmartin', template: 'argyllBute' },
  { slug: 'connel', city: 'Connel', template: 'argyllBute' },
  { slug: 'taynuilt', city: 'Taynuilt', template: 'argyllBute' },
  { slug: 'dalmally', city: 'Dalmally', template: 'argyllBute' },
  { slug: 'salen', city: 'Salen', template: 'argyllBute' },
  { slug: 'bowmore', city: 'Bowmore', template: 'argyllBute' },
  { slug: 'port-ellen', city: 'Port Ellen', template: 'argyllBute' },

  // Borders
  { slug: 'hawick', city: 'Hawick', template: 'borders' },
  { slug: 'peebles', city: 'Peebles', template: 'borders' },
  { slug: 'kelso', city: 'Kelso', template: 'borders' },
  { slug: 'jedburgh', city: 'Jedburgh', template: 'borders' },
  { slug: 'selkirk', city: 'Selkirk', template: 'borders' },
  { slug: 'melrose', city: 'Melrose', template: 'borders' },
  { slug: 'duns', city: 'Duns', template: 'borders' },
  { slug: 'eyemouth', city: 'Eyemouth', template: 'borders' },
  { slug: 'coldstream', city: 'Coldstream', template: 'borders' },
  { slug: 'innerleithen', city: 'Innerleithen', template: 'borders' },
  { slug: 'walkerburn', city: 'Walkerburn', template: 'borders' },
  { slug: 'lauder', city: 'Lauder', template: 'borders' },
  { slug: 'earlston', city: 'Earlston', template: 'borders' },
  { slug: 'newtown-st-boswells', city: 'Newtown St Boswells', template: 'borders' },
  { slug: 'st-boswells', city: 'St Boswells', template: 'borders' },
  { slug: 'denholm', city: 'Denholm', template: 'borders' },
  { slug: 'ettrick-bridge', city: 'Ettrick Bridge', template: 'borders' },
  { slug: 'yetholm', city: 'Yetholm', template: 'borders' },
  { slug: 'chirnside', city: 'Chirnside', template: 'borders' },

  // Dumfries & Galloway
  { slug: 'stranraer', city: 'Stranraer', template: 'dumfries' },
  { slug: 'castle-douglas', city: 'Castle Douglas', template: 'dumfries' },
  { slug: 'lockerbie', city: 'Lockerbie', template: 'dumfries' },
  { slug: 'annan', city: 'Annan', template: 'dumfries' },
  { slug: 'newton-stewart', city: 'Newton Stewart', template: 'dumfries' },
  { slug: 'kirkcudbright', city: 'Kirkcudbright', template: 'dumfries' },
  { slug: 'gretna', city: 'Gretna', template: 'dumfries' },
  { slug: 'moffat', city: 'Moffat', template: 'dumfries' },
  { slug: 'sanquhar', city: 'Sanquhar', template: 'dumfries' },
  { slug: 'thornhill-dg', city: 'Thornhill', template: 'dumfries' },
  { slug: 'langholm', city: 'Langholm', template: 'dumfries' },
  { slug: 'dalbeattie', city: 'Dalbeattie', template: 'dumfries' },
  { slug: 'gatehouse-of-fleet', city: 'Gatehouse of Fleet', template: 'dumfries' },
  { slug: 'kirkconnel', city: 'Kirkconnel', template: 'dumfries' },
  { slug: 'kelloholm', city: 'Kelloholm', template: 'dumfries' },
  { slug: 'whithorn', city: 'Whithorn', template: 'dumfries' },
  { slug: 'wigtown', city: 'Wigtown', template: 'dumfries' },
  { slug: 'stranraer-cairnryan', city: 'Cairnryan', template: 'dumfries' },
  { slug: 'glenluce', city: 'Glenluce', template: 'dumfries' },
  { slug: 'creetown', city: 'Creetown', template: 'dumfries' },

  // West Lothian
  { slug: 'bathgate', city: 'Bathgate', template: 'westLothian' },
  { slug: 'broxburn', city: 'Broxburn', template: 'westLothian' },
  { slug: 'linlithgow', city: 'Linlithgow', template: 'westLothian' },
  { slug: 'whitburn', city: 'Whitburn', template: 'westLothian' },
  { slug: 'armadale-wl', city: 'Armadale', template: 'westLothian' },
  { slug: 'fauldhouse', city: 'Fauldhouse', template: 'westLothian' },
  { slug: 'west-calder', city: 'West Calder', template: 'westLothian' },
  { slug: 'east-calder', city: 'East Calder', template: 'westLothian' },
  { slug: 'mid-calder', city: 'Mid Calder', template: 'westLothian' },
  { slug: 'uphall', city: 'Uphall', template: 'westLothian' },
  { slug: 'winchburgh', city: 'Winchburgh', template: 'westLothian' },
  { slug: 'kirkliston', city: 'Kirkliston', template: 'westLothian' },
  { slug: 'south-queensferry', city: 'South Queensferry', template: 'westLothian' },
  { slug: 'pumpherston', city: 'Pumpherston', template: 'westLothian' },
  { slug: 'addiewell', city: 'Addiewell', template: 'westLothian' },
  { slug: 'blackridge', city: 'Blackridge', template: 'westLothian' },
  { slug: 'breich', city: 'Breich', template: 'westLothian' },

  // Midlothian
  { slug: 'dalkeith', city: 'Dalkeith', template: 'midlothian' },
  { slug: 'penicuik', city: 'Penicuik', template: 'midlothian' },
  { slug: 'bonnyrigg', city: 'Bonnyrigg', template: 'midlothian' },
  { slug: 'loanhead', city: 'Loanhead', template: 'midlothian' },
  { slug: 'roslin', city: 'Roslin', template: 'midlothian' },
  { slug: 'gorebridge', city: 'Gorebridge', template: 'midlothian' },
  { slug: 'newtongrange', city: 'Newtongrange', template: 'midlothian' },
  { slug: 'mayfield', city: 'Mayfield', template: 'midlothian' },
  { slug: 'rosewell', city: 'Rosewell', template: 'midlothian' },
  { slug: 'pathhead', city: 'Pathhead', template: 'midlothian' },

  // East Lothian
  { slug: 'haddington', city: 'Haddington', template: 'eastLothian' },
  { slug: 'tranent', city: 'Tranent', template: 'eastLothian' },
  { slug: 'north-berwick', city: 'North Berwick', template: 'eastLothian' },
  { slug: 'dunbar', city: 'Dunbar', template: 'eastLothian' },
  { slug: 'musselburgh', city: 'Musselburgh', template: 'eastLothian' },
  { slug: 'prestonpans', city: 'Prestonpans', template: 'eastLothian' },
  { slug: 'cockenzie', city: 'Cockenzie', template: 'eastLothian' },
  { slug: 'longniddry', city: 'Longniddry', template: 'eastLothian' },
  { slug: 'aberlady', city: 'Aberlady', template: 'eastLothian' },
  { slug: 'gullane', city: 'Gullane', template: 'eastLothian' },
  { slug: 'east-linton', city: 'East Linton', template: 'eastLothian' },
  { slug: 'pencaitland', city: 'Pencaitland', template: 'eastLothian' },
  { slug: 'ormiston', city: 'Ormiston', template: 'eastLothian' },

  // Orkney
  { slug: 'kirkwall', city: 'Kirkwall', template: 'orkney' },
  { slug: 'stromness', city: 'Stromness', template: 'orkney' },
  { slug: 'st-margarets-hope', city: 'St Margaret’s Hope', template: 'orkney' },
  { slug: 'finstown', city: 'Finstown', template: 'orkney' },
  { slug: 'dounby', city: 'Dounby', template: 'orkney' },

  // Shetland
  { slug: 'lerwick', city: 'Lerwick', template: 'shetland' },
  { slug: 'scalloway', city: 'Scalloway', template: 'shetland' },
  { slug: 'brae', city: 'Brae', template: 'shetland' },
  { slug: 'sumburgh', city: 'Sumburgh', template: 'shetland' },

  // Western Isles
  { slug: 'stornoway', city: 'Stornoway', template: 'westernIsles' },
  { slug: 'tarbert-harris', city: 'Tarbert (Harris)', template: 'westernIsles' },
  { slug: 'lochmaddy', city: 'Lochmaddy', template: 'westernIsles' },
  { slug: 'castlebay', city: 'Castlebay', template: 'westernIsles' },
  { slug: 'benbecula', city: 'Benbecula', template: 'westernIsles' },

  // Additional coverage — Aberdeenshire & Moray villages
  { slug: 'huntly', city: 'Huntly', template: 'aberdeen' },
  { slug: 'turriff', city: 'Turriff', template: 'aberdeen' },
  { slug: 'banchory', city: 'Banchory', template: 'aberdeen' },
  { slug: 'aboyne', city: 'Aboyne', template: 'aberdeen' },
  { slug: 'ballater', city: 'Ballater', template: 'aberdeen' },
  { slug: 'braemar', city: 'Braemar', template: 'aberdeen' },
  { slug: 'alford', city: 'Alford', template: 'aberdeen' },
  { slug: 'kemnay', city: 'Kemnay', template: 'aberdeen' },
  { slug: 'kintore', city: 'Kintore', template: 'aberdeen' },
  { slug: 'oldmeldrum', city: 'Oldmeldrum', template: 'aberdeen' },
  { slug: 'mintlaw', city: 'Mintlaw', template: 'aberdeen' },
  { slug: 'macduff', city: 'Macduff', template: 'aberdeen' },
  { slug: 'gardenstown', city: 'Gardenstown', template: 'aberdeen' },
  { slug: 'rosehearty', city: 'Rosehearty', template: 'aberdeen' },
  { slug: 'cullen', city: 'Cullen', template: 'moray' },
  { slug: 'aberlour', city: 'Aberlour', template: 'moray' },
  { slug: 'rothes', city: 'Rothes', template: 'moray' },
  { slug: 'dufftown', city: 'Dufftown', template: 'moray' },
  { slug: 'keith', city: 'Keith', template: 'moray' },
  { slug: 'fochabers', city: 'Fochabers', template: 'moray' },
  { slug: 'burghead', city: 'Burghead', template: 'moray' },
  { slug: 'hopeman', city: 'Hopeman', template: 'moray' },
  { slug: 'findhorn', city: 'Findhorn', template: 'moray' },

  // Additional coverage — Highlands villages
  { slug: 'aviemore', city: 'Aviemore', template: 'highlands' },
  { slug: 'kingussie', city: 'Kingussie', template: 'highlands' },
  { slug: 'newtonmore', city: 'Newtonmore', template: 'highlands' },
  { slug: 'grantown-on-spey', city: 'Grantown-on-Spey', template: 'highlands' },
  { slug: 'nairn', city: 'Nairn', template: 'highlands' },
  { slug: 'dingwall', city: 'Dingwall', template: 'highlands' },
  { slug: 'alness', city: 'Alness', template: 'highlands' },
  { slug: 'invergordon', city: 'Invergordon', template: 'highlands' },
  { slug: 'tain', city: 'Tain', template: 'highlands' },
  { slug: 'dornoch', city: 'Dornoch', template: 'highlands' },
  { slug: 'golspie', city: 'Golspie', template: 'highlands' },
  { slug: 'brora', city: 'Brora', template: 'highlands' },
  { slug: 'helmsdale', city: 'Helmsdale', template: 'highlands' },
  { slug: 'wick', city: 'Wick', template: 'highlands' },
  { slug: 'thurso', city: 'Thurso', template: 'highlands' },
  { slug: 'john-o-groats', city: 'John o’ Groats', template: 'highlands' },
  { slug: 'ullapool', city: 'Ullapool', template: 'highlands' },
  { slug: 'gairloch', city: 'Gairloch', template: 'highlands' },
  { slug: 'portree', city: 'Portree', template: 'highlands' },
  { slug: 'kyle-of-lochalsh', city: 'Kyle of Lochalsh', template: 'highlands' },
  { slug: 'mallaig', city: 'Mallaig', template: 'highlands' },
  { slug: 'fort-augustus', city: 'Fort Augustus', template: 'highlands' },
  { slug: 'beauly', city: 'Beauly', template: 'highlands' },
  { slug: 'muir-of-ord', city: 'Muir of Ord', template: 'highlands' },
  { slug: 'cromarty', city: 'Cromarty', template: 'highlands' },
  { slug: 'fortrose', city: 'Fortrose', template: 'highlands' },
  { slug: 'lairg', city: 'Lairg', template: 'highlands' },
  { slug: 'bonar-bridge', city: 'Bonar Bridge', template: 'highlands' },

  // Additional coverage — Argyll & Bute
  { slug: 'dunoon', city: 'Dunoon', template: 'argyllBute' },
  { slug: 'lochgilphead', city: 'Lochgilphead', template: 'argyllBute' },
  { slug: 'inveraray', city: 'Inveraray', template: 'argyllBute' },
  { slug: 'campbeltown', city: 'Campbeltown', template: 'argyllBute' },
  { slug: 'tarbert-argyll', city: 'Tarbert (Argyll)', template: 'argyllBute' },
  { slug: 'tobermory', city: 'Tobermory', template: 'argyllBute' },
  { slug: 'bowmore', city: 'Bowmore', template: 'argyllBute' },
  { slug: 'port-ellen', city: 'Port Ellen', template: 'argyllBute' },
  { slug: 'rothesay', city: 'Rothesay', template: 'argyllBute' },
  { slug: 'cardross', city: 'Cardross', template: 'argyllBute' },
  { slug: 'arrochar', city: 'Arrochar', template: 'argyllBute' },
  { slug: 'tarbet-loch-lomond', city: 'Tarbet (Loch Lomond)', template: 'argyllBute' },

  // Additional coverage — Perth & Kinross
  { slug: 'perth', city: 'Perth', template: 'perthKinross' },
  { slug: 'pitlochry', city: 'Pitlochry', template: 'perthKinross' },
  { slug: 'aberfeldy', city: 'Aberfeldy', template: 'perthKinross' },
  { slug: 'crieff', city: 'Crieff', template: 'perthKinross' },
  { slug: 'auchterarder', city: 'Auchterarder', template: 'perthKinross' },
  { slug: 'kinross', city: 'Kinross', template: 'perthKinross' },
  { slug: 'milnathort', city: 'Milnathort', template: 'perthKinross' },
  { slug: 'blairgowrie', city: 'Blairgowrie', template: 'perthKinross' },
  { slug: 'coupar-angus', city: 'Coupar Angus', template: 'perthKinross' },
  { slug: 'dunkeld', city: 'Dunkeld', template: 'perthKinross' },
  { slug: 'birnam', city: 'Birnam', template: 'perthKinross' },
  { slug: 'methven', city: 'Methven', template: 'perthKinross' },
  { slug: 'scone', city: 'Scone', template: 'perthKinross' },
  { slug: 'bridge-of-earn', city: 'Bridge of Earn', template: 'perthKinross' },
  { slug: 'comrie', city: 'Comrie', template: 'perthKinross' },
  { slug: 'st-fillans', city: 'St Fillans', template: 'perthKinross' },
  { slug: 'blair-atholl', city: 'Blair Atholl', template: 'perthKinross' },

  // Additional coverage — Dundee & Angus
  { slug: 'broughty-ferry', city: 'Broughty Ferry', template: 'dundee' },
  { slug: 'monifieth', city: 'Monifieth', template: 'dundee' },
  { slug: 'carnoustie', city: 'Carnoustie', template: 'dundee' },
  { slug: 'arbroath', city: 'Arbroath', template: 'dundee' },
  { slug: 'montrose', city: 'Montrose', template: 'dundee' },
  { slug: 'brechin', city: 'Brechin', template: 'dundee' },
  { slug: 'forfar', city: 'Forfar', template: 'dundee' },
  { slug: 'kirriemuir', city: 'Kirriemuir', template: 'dundee' },
  { slug: 'edzell', city: 'Edzell', template: 'dundee' },
  { slug: 'friockheim', city: 'Friockheim', template: 'dundee' },

  // Additional coverage — Borders & Dumfries
  { slug: 'hawick', city: 'Hawick', template: 'borders' },
  { slug: 'peebles', city: 'Peebles', template: 'borders' },
  { slug: 'kelso', city: 'Kelso', template: 'borders' },
  { slug: 'jedburgh', city: 'Jedburgh', template: 'borders' },
  { slug: 'selkirk', city: 'Selkirk', template: 'borders' },
  { slug: 'melrose', city: 'Melrose', template: 'borders' },
  { slug: 'innerleithen', city: 'Innerleithen', template: 'borders' },
  { slug: 'duns', city: 'Duns', template: 'borders' },
  { slug: 'coldstream', city: 'Coldstream', template: 'borders' },
  { slug: 'eyemouth', city: 'Eyemouth', template: 'borders' },
  { slug: 'newtown-st-boswells', city: 'Newtown St Boswells', template: 'borders' },
  { slug: 'stranraer', city: 'Stranraer', template: 'dumfries' },
  { slug: 'castle-douglas', city: 'Castle Douglas', template: 'dumfries' },
  { slug: 'lockerbie', city: 'Lockerbie', template: 'dumfries' },
  { slug: 'annan', city: 'Annan', template: 'dumfries' },
  { slug: 'moffat', city: 'Moffat', template: 'dumfries' },
  { slug: 'gretna', city: 'Gretna', template: 'dumfries' },
  { slug: 'kirkcudbright', city: 'Kirkcudbright', template: 'dumfries' },
  { slug: 'newton-stewart', city: 'Newton Stewart', template: 'dumfries' },
  { slug: 'sanquhar', city: 'Sanquhar', template: 'dumfries' },
  { slug: 'thornhill', city: 'Thornhill', template: 'dumfries' },
  { slug: 'langholm', city: 'Langholm', template: 'dumfries' },
  { slug: 'dalbeattie', city: 'Dalbeattie', template: 'dumfries' },
  { slug: 'whithorn', city: 'Whithorn', template: 'dumfries' },
  { slug: 'wigtown', city: 'Wigtown', template: 'dumfries' },
];

function buildLocationPageFromTemplate(
  spec: SimpleP1Spec,
  priority: 1 | 2,
): LocationPage {
  const t = REGION_TEMPLATES[spec.template]!;
  const sections: readonly LocationContentSection[] = [
    {
      heading: `Mobile tyre fitting in ${spec.city}`,
      body: [
        `We are a mobile tyre fitter covering ${spec.city} in ${t.region}. ${t.contextLine}`,
        `For ${spec.city} drivers, the typical call out is a flat at home, a slow puncture caught the next morning, or roadside damage on a regional route.`,
      ],
    },
    {
      heading: `Roads and routes around ${spec.city}`,
      body: [
        `The arterial routes that affect tyre call outs around ${spec.city} include ${t.roads.join(', ')}. Tyre damage from kerbs, potholes and motorway debris is the regular pattern.`,
      ],
    },
    {
      heading: `Out-of-hours service for ${spec.city}`,
      body: [
        `Local tyre shops in and around ${spec.city} largely keep daytime hours. The mobile service covers evenings, nights, weekends and bank holidays — pricing for unsocial hours is shown clearly in the quote before payment.`,
      ],
    },
  ];

  const faq: readonly LocationFaqItem[] = [
    {
      question: `Do you really cover ${spec.city}?`,
      answer: `Yes — ${spec.city} is part of our regular Scotland-wide mobile cover. Travel times are honest and always quoted clearly before you commit.`,
    },
    {
      question: `Can you come out at night in ${spec.city}?`,
      answer: `Yes — late-night, weekend and bank holiday call outs are part of the 24/7 mobile service.`,
    },
    {
      question: `What if my tyre size isn’t standard?`,
      answer:
        'If the exact tyre is not on the van we will source it. The site will show "Special order — fitted within 3 working days" before you pay.',
    },
  ];

  return {
    slug: spec.slug,
    city: spec.city,
    region: spec.region,
    metaTitle: `Mobile Tyre Fitting ${spec.city} | TyreRepair UK`,
    metaDescription: `Mobile tyre fitting in ${spec.city}, ${spec.region}. Covering home, work and roadside call outs across ${spec.region}.`,
    heroTitle: `Mobile tyre fitting in ${spec.city}`,
    heroIntro: `${spec.city} is part of our regular ${t.region} cover. We come to you — at home, at work or roadside — with the right tyre and the equipment to fit and balance it on the vehicle.`,
    primaryKeywords: spec.primary,
    secondaryKeywords: ['mobile tyre fitter Glasgow', `mobile tyre fitting ${t.region}`],
    localContext: `${spec.city} is in ${t.region}. ${t.contextLine}`,
    roadContext: t.roads,
    nearbyAreas: t.representativeNearby,
    commonCallouts: t.callouts,
    contentSections: sections,
    faq,
    relatedServices: [...SERVICE_BUNDLE],
    nearbyLocationSlugs: spec.nearbySlugs,
    priority,
  };
}

function buildExtraLocationPage(entry: CityEntry): LocationPage {
  const t = REGION_TEMPLATES[entry.template]!;
  const sections: readonly LocationContentSection[] = [
    {
      heading: `${entry.city} mobile tyre cover`,
      body: [
        `${entry.city} is in ${t.region}. ${entry.city} is part of our regular ${t.region} mobile tyre fitting cover.`,
        t.contextLine,
      ],
    },
    {
      heading: `When ${entry.city} drivers usually call`,
      body: [
        `The most common call patterns we see in ${entry.city} mirror the ${t.region} pattern: ${t.callouts.slice(0, 3).join(', ')}.`,
      ],
    },
  ];

  const faq: readonly LocationFaqItem[] = [
    {
      question: `Is mobile tyre fitting available in ${entry.city}?`,
      answer: `Yes — ${entry.city} is part of our regular ${t.region} cover, served by our Scotland-wide mobile fleet. Travel time is honest and always confirmed before you commit.`,
    },
    {
      question: `Can you come at night to ${entry.city}?`,
      answer:
        'Yes — out-of-hours and weekend call outs are part of the 24/7 service. Pricing for unsocial hours is shown in the quote before payment.',
    },
  ];

  return {
    slug: entry.slug,
    city: entry.city,
    region: t.region,
    metaTitle: `Mobile Tyre Fitting ${entry.city} | TyreRepair UK`,
    metaDescription: `Mobile tyre fitting in ${entry.city}, ${t.region}. Covering home, work and roadside tyre call outs across ${t.region}.`,
    heroTitle: `Mobile tyre fitting in ${entry.city}`,
    heroIntro: `${entry.city} is part of our regular ${t.region} cover. We come to you with the right tyre and the equipment to fit and balance it on the vehicle.`,
    primaryKeywords: [
      `mobile tyre fitting ${entry.city}`,
      `tyre fitter ${entry.city}`,
      `mobile tyre fitter ${t.region}`,
    ],
    secondaryKeywords: ['mobile tyre fitter Glasgow', `mobile tyre fitting ${t.region}`],
    localContext: `${entry.city} is in ${t.region}. ${t.contextLine}`,
    roadContext: t.roads,
    nearbyAreas: t.representativeNearby,
    commonCallouts: t.callouts,
    contentSections: sections,
    faq,
    relatedServices: [...SERVICE_BUNDLE],
    nearbyLocationSlugs: entry.nearby ?? [],
    priority: 3,
  };
}

const PRIORITY_THREE: readonly LocationPage[] = EXTRA_TOWNS.map(buildExtraLocationPage);

const PRIORITY_ONE_TEMPLATED: readonly LocationPage[] = SIMPLE_PRIORITY_ONE.map((spec) =>
  buildLocationPageFromTemplate(spec, 1),
);

export const locationPages: readonly LocationPage[] = [
  ...PRIORITY_ONE,
  ...PRIORITY_ONE_TEMPLATED,
  ...PRIORITY_TWO,
  ...PRIORITY_THREE,
];

export function findLocationPage(slug: string): LocationPage | undefined {
  return locationPages.find((p) => p.slug === slug);
}

export function getAllLocationSlugs(): readonly string[] {
  return locationPages.map((p) => p.slug);
}

export function getLocationPagesByPriority(priority: 1 | 2 | 3): readonly LocationPage[] {
  return locationPages.filter((p) => p.priority === priority);
}

export function getLocationLinkItems(): readonly { label: string; href: string; description?: string }[] {
  return locationPages.map((p) => {
    const item: { label: string; href: string; description?: string } = {
      label: p.city,
      href: `/locations/${p.slug}`,
    };
    if (p.primaryKeywords[0]) item.description = p.primaryKeywords[0];
    return item;
  });
}
