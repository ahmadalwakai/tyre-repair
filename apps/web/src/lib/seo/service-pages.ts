import type { ServicePage } from '@/types/seo';

const COMMON_REPAIR_NOTE =
  'A puncture is only safely repairable if the damage is in the central tread area, the tyre is undamaged elsewhere, and there is no sign of internal cord damage. Any sidewall damage, bulge, run-flat that has been driven on flat, or repeated punctures usually means the tyre needs to be replaced rather than repaired.';

export const servicePages: readonly ServicePage[] = [
  {
    slug: 'mobile-tyre-fitting',
    title: 'Mobile tyre fitting',
    metaTitle: 'Mobile Tyre Fitting Near You | TyreRepair UK',
    metaDescription:
      'Mobile tyre fitting at home, work or roadside. A Scotland-wide mobile tyre fleet with new tyres fitted on your driveway, day or night, anywhere in Scotland.',
    heroTitle: 'Mobile tyre fitting that comes to you',
    heroIntro:
      'A mobile tyre fitter saves you towing the car to a garage. We come to your home, your workplace or the roadside with the right tyre and the equipment to fit and balance it on the vehicle.',
    primaryKeywords: [
      'mobile tyre fitting near me',
      'mobile tyre fitter come to home',
      'tyre fitter that comes to you',
      'new tyres fitted on driveway',
      'buy tyres fitted at home Glasgow',
    ],
    secondaryKeywords: [
      'mobile tyre fitter Glasgow',
      'mobile tyre fitting Edinburgh',
      'mobile tyre fitting Scotland',
    ],
    sections: [
      {
        heading: 'What mobile tyre fitting actually means',
        body: [
          'Mobile tyre fitting is a service where a fully equipped tyre van comes to your location, removes the wheel, fits the new tyre on the rim, balances it, and refits it to the vehicle.',
          'For most cars and light vans we can do the full job at the kerbside with the vehicle in place. There is no need for you to drive on a damaged tyre or arrange recovery to a garage.',
        ],
      },
      {
        heading: 'When mobile tyre fitting is the better option',
        body: [
          'It is the right choice when the tyre is too damaged to drive on, when you cannot leave the car at a garage, when you need work or family vehicles back on the road quickly, or when garage opening hours simply do not work for you.',
        ],
        bullets: [
          'Flat tyre on a driveway or in a car park',
          'Slow puncture that has finally given out',
          'Run-flat tyre that has been driven on and now needs replacing',
          'A wheel removed in the boot needing a new tyre fitted',
          'Fleet vehicles you cannot afford to send to a depot',
        ],
      },
      {
        heading: 'How the booking and quote works',
        body: [
          'You start an instant quote, share the location and the vehicle, choose a tyre, and pay securely. The price is calculated for the actual job — there are no surprise add-ons after arrival, and we never ask you to pick a date or time.',
        ],
      },
    ],
    faq: [
      {
        question: 'Can a mobile tyre fitter come to my house?',
        answer:
          'Yes. The service is built around fitting at the customer’s location — driveway, kerbside or car park, as long as it is safe to work.',
      },
      {
        question: 'Can you fit tyres I supply myself?',
        answer:
          'We strongly recommend buying through the quote so the tyre is the correct size, load and speed rating for your vehicle. We can advise if a customer-supplied tyre is suitable.',
      },
      {
        question: 'Do I need to be home for the fitting?',
        answer:
          'You need to be reachable on the phone number you provide so we can confirm wheel access, alarm settings and locking wheel nut location.',
      },
    ],
    relatedServices: ['emergency-tyre-repair', 'puncture-repair', '24-hour-mobile-tyre-fitting'],
    relatedLocations: ['glasgow', 'edinburgh', 'paisley', 'east-kilbride'],
    ctaLabel: 'Get my mobile fitting quote',
    ctaHref: '/quote',
  },
  {
    slug: 'emergency-tyre-repair',
    title: 'Emergency tyre repair',
    metaTitle: 'Emergency Tyre Repair Near You | TyreRepair UK',
    metaDescription:
      'Emergency mobile tyre repair for flat tyres, blowouts and damaged tyres at your location. Scotland-wide mobile fleet — vans dispatched 24/7, no date or time picker.',
    heroTitle: 'Emergency tyre repair when you cannot drive on it',
    heroIntro:
      'A flat tyre, sudden blowout or badly damaged tyre is not something to drive on. We dispatch a mobile fitter to your location with replacement options so the car can be back on the road safely.',
    primaryKeywords: [
      'emergency tyre repair near me',
      'flat tyre help near me',
      'someone to come fix my tyre',
      'flat tyre someone come to me',
      'tyre blowout help Glasgow',
    ],
    secondaryKeywords: [
      'emergency tyre Glasgow',
      'emergency tyre Edinburgh',
      'mobile tyre fitter come to home',
    ],
    sections: [
      {
        heading: 'What counts as an emergency tyre call out',
        body: [
          'An emergency call out is any situation where the vehicle should not be driven on the tyre. That includes complete deflation, sidewall damage, a visible bulge in the wall, repeated rapid pressure loss, or a wheel that is sitting on the rim after a kerb strike.',
        ],
      },
      {
        heading: 'What we bring to an emergency call',
        body: [
          'Each call out is handled by a fully kitted tyre van: jack, torque equipment, tyre machine and balancer, and a stock of common car and light van sizes. If the exact tyre is not on board we will be honest about that, source the closest like-for-like and explain timings before you commit.',
        ],
      },
      {
        heading: 'Safety first — before we arrive',
        body: [
          'If you are on a live carriageway, hard shoulder or anywhere with passing traffic, you should follow official road safety advice first: get yourself away from the vehicle to a safe place, keep your hazards on, and contact the appropriate emergency service if you feel unsafe.',
        ],
      },
    ],
    faq: [
      {
        question: 'How fast can a mobile tyre fitter come out?',
        answer:
          'Real-world dispatch depends on traffic, weather and how busy we are at that moment. We are honest about timing on the call rather than promising a number we cannot guarantee.',
      },
      {
        question: 'Can you replace a tyre if I am not home?',
        answer:
          'In some cases yes — if we can access the vehicle safely, the locking wheel nut key is reachable, and you are contactable by phone for confirmation.',
      },
      {
        question: 'What if my tyre size is unusual?',
        answer:
          'If the exact size is not on the van we will check stock and source it. The site will show "Special order — fitted within 3 working days" before you pay.',
      },
    ],
    relatedServices: ['mobile-tyre-fitting', 'roadside-tyre-fitting', 'puncture-repair'],
    relatedLocations: ['glasgow', 'edinburgh', 'paisley', 'hamilton'],
    ctaLabel: 'Start emergency quote',
    ctaHref: '/quote',
  },
  {
    slug: '24-hour-mobile-tyre-fitting',
    title: '24 hour mobile tyre fitting',
    metaTitle: '24 Hour Mobile Tyre Fitting | Open Now Tyre Help',
    metaDescription:
      '24 hour mobile tyre fitting for late-night, weekend and out-of-hours tyre help. Scotland-wide mobile fleet covering night-time and Sunday tyre call outs.',
    heroTitle: '24 hour mobile tyre fitting — out-of-hours tyre help',
    heroIntro:
      'Tyres rarely fail at convenient times. The service is built for late evenings, nights, Sundays and bank holidays — when most local garages are shut and you still need to be moving in the morning.',
    primaryKeywords: [
      '24 hour tyre fitting near me',
      'tyre fitter open now',
      'out of hours tyre fitter',
      'tyre fitter at night near me',
      'late night tyre fitting Glasgow',
      'tyre fitter tonight Edinburgh',
    ],
    secondaryKeywords: [
      'emergency tyre fitter weekend',
      'tyre repair Sunday Glasgow',
      '24/7 mobile tyre fitting Scotland',
    ],
    sections: [
      {
        heading: 'How an out-of-hours call out works',
        body: [
          'Demand is uneven outside garage hours, so we never ask you to pick a slot. You request the call out, the system prices it for the conditions at that moment, and we confirm timing on the phone.',
          'Pricing reflects time of day, weather, weekend or bank holiday surcharges, travel distance to your location, and current demand. The quote is shown clearly before you pay.',
        ],
      },
      {
        heading: 'When out-of-hours fitting genuinely helps',
        body: [
          'It is the right call when you need the vehicle for an early start, when leaving the car overnight is not safe or practical, or when a flat happens long after local tyre shops have shut.',
        ],
        bullets: [
          'Late-night flat in a residential street',
          'Sunday call out where local tyre shops are closed',
          'Bank holiday weekend tyre damage before a long drive',
          'Vehicles that need to be back on the road for the morning shift',
        ],
      },
    ],
    faq: [
      {
        question: 'Do mobile tyre fitters work on Sundays?',
        answer:
          'Yes — Sundays and bank holidays are part of the 24/7 service. Pricing for unsocial hours is shown in the quote before payment.',
      },
      {
        question: 'Are night call outs more expensive?',
        answer:
          'Night, weekend and bank holiday call outs are priced higher than mid-week daytime work. The reason is honest: longer driver hours, fewer suppliers open, and higher operational cost.',
      },
    ],
    relatedServices: ['emergency-tyre-repair', 'roadside-tyre-fitting', 'mobile-tyre-fitting'],
    relatedLocations: ['glasgow', 'edinburgh', 'aberdeen', 'dundee'],
    ctaLabel: 'Get an out-of-hours quote',
    ctaHref: '/quote',
  },
  {
    slug: 'puncture-repair',
    title: 'Puncture repair',
    metaTitle: 'Mobile Puncture Repair | Nail, Screw and Slow Puncture Help',
    metaDescription:
      'Mobile puncture repair for nails, screws and slow punctures. Honest advice on whether the tyre is repairable or needs replacement, across Scotland.',
    heroTitle: 'Mobile puncture repair — nail, screw or slow leak',
    heroIntro:
      'Most punctures show up as a slow leak in the morning or a sudden deflation after a kerb strike or a screw on the road. We come to you, inspect the tyre, and tell you honestly whether a safe repair is possible.',
    primaryKeywords: [
      'tyre puncture repair near me',
      'nail in my tyre repair',
      'screw in tyre repair Glasgow',
      'slow puncture repair near me',
      'can you fix a tyre with a nail in it',
      'tyre keeps losing pressure repair',
    ],
    secondaryKeywords: [
      'cheap puncture repair near me',
      'pothole damage tyre Glasgow',
      'side wall damage tyre repair',
    ],
    sections: [
      {
        heading: 'When a puncture can safely be repaired',
        body: [COMMON_REPAIR_NOTE],
        bullets: [
          'Damage is in the central tread area',
          'Hole is small enough for an internal patch-plug',
          'No sidewall damage and no visible bulge',
          'Tyre has not been driven on flat for a long distance',
        ],
      },
      {
        heading: 'When a tyre should be replaced instead',
        body: [
          'Sidewall damage, internal cord damage, large gashes, run-flats that have been driven on flat, or any sign of a bulge in the wall mean the tyre is no longer safe. Replacement is the right answer in those cases.',
        ],
      },
      {
        heading: 'How long a mobile puncture repair takes',
        body: [
          'For a single tyre, a typical visit is short once the fitter is on site — wheel off, internal inspection, repair fitted from the inside, balanced, and refitted. The variable part is travel time, not the work itself.',
        ],
      },
    ],
    faq: [
      {
        question: 'Can a tyre be repaired with a nail still in it?',
        answer:
          'Not safely. The tyre has to come off the wheel so the inside can be inspected. A safe repair is fitted from the inside of the tyre, not just plugged from the outside.',
      },
      {
        question: 'My tyre keeps losing pressure — what do I do?',
        answer:
          'Slow pressure loss is usually a small puncture, valve issue, or rim leak. Driving on it makes any internal damage worse. A mobile inspection is the safe option.',
      },
      {
        question: 'Can you repair sidewall damage?',
        answer:
          'No reputable fitter will repair sidewall damage. The sidewall flexes constantly and any repair there is unsafe. Replacement is the only correct option.',
      },
    ],
    relatedServices: ['emergency-tyre-repair', 'mobile-tyre-fitting', '24-hour-mobile-tyre-fitting'],
    relatedLocations: ['glasgow', 'edinburgh', 'paisley', 'falkirk'],
    ctaLabel: 'Quote my puncture repair',
    ctaHref: '/quote',
  },
  {
    slug: 'roadside-tyre-fitting',
    title: 'Roadside tyre fitting',
    metaTitle: 'Roadside Tyre Fitting for Flat Tyres and Blowouts',
    metaDescription:
      'Roadside mobile tyre fitting for flat tyres, blowouts and damaged tyres on Scottish motorways and main roads. Scotland-wide mobile fleet — vans dispatched to your location.',
    heroTitle: 'Roadside tyre fitting on Scottish roads',
    heroIntro:
      'A flat tyre on a motorway, dual carriageway or rural road needs a careful, safety-first response. We come out with replacement tyres so the vehicle can complete the journey safely.',
    primaryKeywords: [
      'stuck on motorway flat tyre',
      'roadside tyre fitting Scotland',
      'burst tyre on motorway help',
      'tyre help M74',
      'flat tyre M9 motorway',
      'tyre help on A9',
    ],
    secondaryKeywords: [
      'broken down with flat tyre Glasgow',
      'flat tyre on M8 help',
      'stranded flat tyre near me',
    ],
    sections: [
      {
        heading: 'Roads we cover most often',
        body: [
          'Most roadside call outs come from the central belt — the M8, M74, M73, M77, M80 and the Edinburgh bypass — but the service is Scotland-wide. Highland routes such as the A9, A82 and A90 are also part of regular cover.',
        ],
        bullets: ['M8', 'M74', 'M73', 'M77', 'M80', 'M9', 'M90', 'A9', 'A90', 'A82', 'A1'],
      },
      {
        heading: 'If you are stopped on a motorway or fast road',
        body: [
          'Move to a safe place if you can do so without driving on a destroyed tyre, switch hazards on, leave the vehicle from the side away from traffic, and follow official road safety guidance for stopping on the carriageway.',
        ],
        callout:
          'Motorway hard shoulders are dangerous. If you do not feel safe, contact the appropriate emergency service first — a tyre call out can follow once you are in a safe location.',
      },
      {
        heading: 'What to expect on arrival',
        body: [
          'The fitter will assess the vehicle position, set up a safe working area, and replace the damaged tyre. If the vehicle is still in a high-risk location we may recommend a recovery move first to a safe area.',
        ],
      },
    ],
    faq: [
      {
        question: 'Can you help if I am stuck on the motorway with a flat tyre?',
        answer:
          'Yes — but motorway hard shoulders are unsafe to work on. We will discuss the safest plan with you, which sometimes means a short recovery to a safe location before fitting the new tyre.',
      },
      {
        question: 'Do you cover Scotland-wide motorway routes?',
        answer:
          'Yes. Our Scotland-wide mobile fleet gives fast cover of the central belt, with extended cover up the A9 corridor and across Lanarkshire, the Lothians, Fife and beyond.',
      },
    ],
    relatedServices: ['emergency-tyre-repair', '24-hour-mobile-tyre-fitting', 'mobile-tyre-fitting'],
    relatedLocations: ['glasgow', 'stirling', 'perth', 'fort-william'],
    ctaLabel: 'Roadside tyre quote',
    ctaHref: '/quote',
  },
  {
    slug: 'run-flat-tyres',
    title: 'Run flat tyres',
    metaTitle: 'Run Flat Tyre Fitter Mobile Service | TyreRepair UK',
    metaDescription:
      'Mobile run flat tyre replacement for BMW, Mini, Audi and other cars that use run flats. Honest advice on when a run flat must be replaced.',
    heroTitle: 'Mobile run flat tyre fitter',
    heroIntro:
      'Run flats let you keep moving for a limited distance after a puncture, but once that distance is exceeded the tyre must be replaced. We carry common run flat sizes and can fit at home, work or roadside.',
    primaryKeywords: [
      'run flat tyre fitter mobile',
      'BMW mobile tyre fitter Glasgow',
      'Audi mobile tyre fitter Edinburgh',
      'premium tyres mobile fitting Edinburgh',
    ],
    secondaryKeywords: [
      'mobile tyre fitter Glasgow',
      'mobile tyre fitting Edinburgh',
    ],
    sections: [
      {
        heading: 'How run flat tyres differ from standard tyres',
        body: [
          'Run flats have reinforced sidewalls that support the vehicle for a limited distance and speed after pressure loss. Once you have driven on one in that condition the structural integrity is compromised and replacement is required, even if the tyre still looks intact.',
        ],
      },
      {
        heading: 'When a run flat must be replaced',
        body: [
          'If the TPMS warning has been on and you have driven a meaningful distance, the run flat should be replaced rather than repaired. Manufacturer guidance on run flat repairs is generally restrictive for safety reasons.',
        ],
      },
    ],
    faq: [
      {
        question: 'Do you fit run flat tyres?',
        answer: 'Yes — common BMW, Mini, Audi and run flat sizes are stocked or sourced quickly.',
      },
      {
        question: 'Can a run flat be repaired?',
        answer:
          'In most cases no. If the run flat has supported the vehicle after pressure loss, the structure is compromised and replacement is the safe option.',
      },
    ],
    relatedServices: ['mobile-tyre-fitting', 'emergency-tyre-repair', '4x4-suv-tyres'],
    relatedLocations: ['glasgow', 'edinburgh', 'east-kilbride', 'paisley'],
    ctaLabel: 'Run flat tyre quote',
    ctaHref: '/quote',
  },
  {
    slug: 'van-tyres',
    title: 'Van tyres',
    metaTitle: 'Mobile Van Tyre Fitting | Transit, Taxi and Fleet Tyres',
    metaDescription:
      'Mobile van tyre fitting for Transit, Sprinter, taxis and small fleets across Scotland. Scotland-wide mobile fleet for fast central-belt cover.',
    heroTitle: 'Mobile van tyre fitting and fleet support',
    heroIntro:
      'Vans, taxis and work vehicles cannot afford to sit at a depot. We carry common van and light commercial sizes and can fit at depot, driveway, customer site or roadside.',
    primaryKeywords: [
      'van tyre fitter mobile Glasgow',
      'transit van tyre replacement mobile',
      'fleet tyre fitting Glasgow',
      'taxi tyre fitter mobile Glasgow',
    ],
    secondaryKeywords: [
      'mobile tyre fitter Glasgow',
      'mobile tyre fitting Scotland',
    ],
    sections: [
      {
        heading: 'Light commercial and van tyres',
        body: [
          'C-rated van tyres carry higher loads than passenger tyres. Fitting the wrong type — or under-spec replacements — leads to early wear, poor handling under load, and possible legal issues for commercial use.',
        ],
        bullets: [
          'Transit, Sprinter, Vivaro, Trafic, Crafter and similar',
          'Taxi and private hire vehicles',
          'Small fleet support arrangements',
          'Plant and tow vehicles where serviceable',
        ],
      },
      {
        heading: 'Fleet thinking, not just one tyre',
        body: [
          'For operators we focus on uptime: same-day or out-of-hours fitting where possible, clean invoicing, and honest stock answers when an exact tyre needs sourcing.',
        ],
      },
    ],
    faq: [
      {
        question: 'Do you fit tyres on taxis?',
        answer:
          'Yes — taxi and private hire vehicles are a common call. Loading patterns are heavy so correct tyre choice matters.',
      },
      {
        question: 'Can you do fleet billing?',
        answer:
          'For small fleets we can arrange clean invoicing — speak to us directly to set this up.',
      },
    ],
    relatedServices: ['mobile-tyre-fitting', 'emergency-tyre-repair', '24-hour-mobile-tyre-fitting'],
    relatedLocations: ['glasgow', 'paisley', 'hamilton', 'east-kilbride'],
    ctaLabel: 'Van tyre quote',
    ctaHref: '/quote',
  },
  {
    slug: '4x4-suv-tyres',
    title: '4x4 and SUV tyres',
    metaTitle: '4x4 and SUV Mobile Tyre Fitting | TyreRepair UK',
    metaDescription:
      'Mobile tyre fitting for 4x4, SUV and motorhome vehicles across Scotland, where serviceable. Scotland-wide mobile fleet, central belt fast cover.',
    heroTitle: 'Mobile tyre fitting for 4x4, SUV and larger vehicles',
    heroIntro:
      'Larger vehicles take heavier wheels and load-rated tyres. We can handle most common 4x4 and SUV sizes at the customer location.',
    primaryKeywords: [
      '4x4 mobile tyre fitting Scotland',
      'SUV mobile tyre fitter',
      'motorhome mobile tyre fitting Scotland',
    ],
    secondaryKeywords: [
      'mobile tyre fitting Scotland',
      'mobile tyre fitter Glasgow',
    ],
    sections: [
      {
        heading: 'What we can serve',
        body: [
          'Common SUV and 4x4 sizes are stocked or sourced quickly. For motorhomes and very large vehicles, please confirm wheel size and access at the quote stage so we can be honest about what we can serve mobile.',
        ],
      },
    ],
    faq: [
      {
        question: 'Can you fit tyres on a motorhome?',
        answer:
          'Where the wheel size and access permit, yes. Some larger motorhome wheels are outside the safe scope of mobile fitting and we will say so.',
      },
    ],
    relatedServices: ['mobile-tyre-fitting', 'run-flat-tyres', 'emergency-tyre-repair'],
    relatedLocations: ['glasgow', 'edinburgh', 'inverness', 'aberdeen'],
    ctaLabel: '4x4 / SUV tyre quote',
    ctaHref: '/quote',
  },
  {
    slug: 'winter-tyres',
    title: 'Winter tyres',
    metaTitle: 'Winter Tyres Fitted at Home Across Scotland',
    metaDescription:
      'Winter tyres fitted at home across Scotland. Cold-weather rubber compound and tread design for Scottish winter driving conditions.',
    heroTitle: 'Winter tyres fitted on the driveway',
    heroIntro:
      'Winter tyres use a different rubber compound and tread design that holds grip in cold, wet and snowy conditions where a summer tyre stiffens up. For drivers who use Scottish rural and Highland routes, the difference is real.',
    primaryKeywords: [
      'winter tyres fitted at home Scotland',
      'order tyres online fitted Scotland',
    ],
    secondaryKeywords: [
      'mobile tyre fitting Scotland',
      'mobile tyre fitter Inverness',
    ],
    sections: [
      {
        heading: 'When winter tyres genuinely help',
        body: [
          'For commuters who only see central-belt motorways in winter, all-season tyres often cover the use case. For drivers using Highland and rural routes regularly through winter, dedicated winter tyres add real grip on cold and snow-covered surfaces.',
        ],
      },
      {
        heading: 'Fitting winter tyres at home',
        body: [
          'Switching to winter tyres at home avoids the seasonal queues at tyre shops. We can fit on the driveway and store the seasonal change-over for you to plan around.',
        ],
      },
    ],
    faq: [
      {
        question: 'Are winter tyres legally required in Scotland?',
        answer:
          'No — Scotland does not legally require winter tyres. They are a personal safety choice that helps in cold and snowy conditions.',
      },
    ],
    relatedServices: ['mobile-tyre-fitting', '4x4-suv-tyres', 'budget-tyres'],
    relatedLocations: ['inverness', 'fort-william', 'perth', 'aberdeen'],
    ctaLabel: 'Winter tyre quote',
    ctaHref: '/quote',
  },
  {
    slug: 'budget-tyres',
    title: 'Budget tyres',
    metaTitle: 'Budget Tyres Fitted at Home | TyreRepair UK',
    metaDescription:
      'Budget tyre options fitted at your home, work or roadside. Clear quote before payment, honest sizing advice, no hidden callout extras.',
    heroTitle: 'Budget tyre options fitted at home',
    heroIntro:
      'When the wallet is the priority, the right answer is a clean budget tyre option that still meets the vehicle’s spec — not a marketing slogan about being the cheapest.',
    primaryKeywords: [
      'budget tyres fitted at home',
      'budget tyres mobile fitting Glasgow',
      'cheap puncture repair near me',
    ],
    secondaryKeywords: [
      'mobile tyre fitting cost UK',
      'tyre callout fee Scotland',
    ],
    sections: [
      {
        heading: 'How we think about budget',
        body: [
          'A correct-spec budget tyre is generally the right answer when the priority is keeping the vehicle legal and on the road. We will not undersell a wear-critical tyre for a vehicle that genuinely needs a stronger spec.',
          'The quote shows the price clearly before you pay. There is no separate callout extra after the fitter arrives.',
        ],
      },
      {
        heading: 'When premium tyres are worth it',
        body: [
          'For high-mileage drivers, performance vehicles, run-flats, or vehicles that need specific load and speed ratings, premium tyres often cost less per mile. We will say when that applies.',
        ],
      },
    ],
    faq: [
      {
        question: 'Are you the cheapest mobile tyre fitter?',
        answer:
          'We do not make cheapest claims. We aim to be transparent — the quote shows the price for the actual job, including time of day, weather and travel distance to your location.',
      },
      {
        question: 'Is mobile tyre fitting cheaper than a garage?',
        answer:
          'It depends on the job and the time. Mobile fitting saves you a tow or a recovery in many cases — that is often where the value sits, not in a flat sticker price comparison.',
      },
    ],
    relatedServices: ['mobile-tyre-fitting', 'puncture-repair', 'winter-tyres'],
    relatedLocations: ['glasgow', 'edinburgh', 'paisley', 'falkirk'],
    ctaLabel: 'Get a budget tyre quote',
    ctaHref: '/quote',
  },
  {
    slug: 'new-tyres-fitted-at-home',
    title: 'New tyres fitted at home',
    metaTitle: 'New Tyres Fitted at Home | Mobile Tyre Fitting',
    metaDescription:
      'Buy new tyres online and have them fitted on your driveway across Scotland. Premium, mid-range and budget options, fitted and balanced on the vehicle.',
    heroTitle: 'New tyres fitted on your driveway',
    heroIntro:
      'Order new tyres for your car or van and have them fitted at home. We bring the tyre, the equipment and the balancer to your driveway — no trip to the garage and no waiting around.',
    primaryKeywords: [
      'new tyres fitted at home',
      'buy tyres fitted at home Glasgow',
      'order tyres online fitted Scotland',
      'mobile tyre fitter come to home',
      'tyre fitter that comes to you',
    ],
    secondaryKeywords: [
      'mobile tyre fitting Scotland',
      'mobile tyre fitter Glasgow',
      'mobile tyre fitting Edinburgh',
    ],
    sections: [
      {
        heading: 'Order and have your tyres fitted at home',
        body: [
          'Start a quote with the vehicle and the tyre size. The price shown includes the tyre, the fitting, valve and balance, and travel to your address. No surprise extras after the fitter arrives.',
        ],
      },
      {
        heading: 'Premium, mid-range and budget tyre choices',
        body: [
          'We will help you pick a tyre that matches the vehicle and the way you drive — not just whatever happens to be cheapest. For high-mileage drivers, run-flats and performance vehicles, a premium tyre often costs less per mile than a budget set.',
        ],
        bullets: [
          'Premium tyre brands for performance and high-mileage',
          'Mid-range options that hit the sweet spot on value',
          'Budget tyres in the correct spec when price is the priority',
        ],
      },
      {
        heading: 'What happens on the day',
        body: [
          'The fitter arrives at the quoted time, removes the wheel, fits and balances the new tyre on a mobile balancer, and torques it back on the vehicle. A typical car visit is well under an hour once on site.',
        ],
      },
    ],
    faq: [
      {
        question: 'How do I know which tyre size to buy?',
        answer:
          'Use your registration in the quote tool and we will confirm the OE size for the vehicle. If you have a non-standard size fitted (e.g. a winter spec) tell us and we will match.',
      },
      {
        question: 'Can you fit just one tyre on the driveway?',
        answer:
          'Yes — single tyre replacement is a regular call out. For best handling we usually recommend axle-pair replacement, but it is your call.',
      },
      {
        question: 'Do I have to be there when you fit the tyres?',
        answer:
          'You need to be reachable on the phone. Physical attendance is helpful for wheel access and locking wheel nut location but not always required.',
      },
    ],
    relatedServices: ['mobile-tyre-fitting', 'budget-tyres', 'run-flat-tyres'],
    relatedLocations: ['glasgow', 'edinburgh', 'paisley', 'hamilton'],
    ctaLabel: 'Quote new tyres fitted',
    ctaHref: '/quote',
  },
  {
    slug: 'same-day-tyre-fitting',
    title: 'Same-day tyre fitting',
    metaTitle: 'Same-Day Mobile Tyre Fitting | TyreRepair UK',
    metaDescription:
      'Same-day mobile tyre fitting where stock and routing permit. Honest dispatch timing, no fake promises — we tell you on the call when we can realistically be there.',
    heroTitle: 'Same-day mobile tyre fitting',
    heroIntro:
      'When you need to be back on the road today, same-day mobile fitting is the right call. We are honest about what is realistic given current jobs, traffic and stock — and we tell you on the call.',
    primaryKeywords: [
      'same day tyre fitting near me',
      'same day mobile tyre fitting Scotland',
      'tyre fitter today Glasgow',
      'urgent tyre fitting',
    ],
    secondaryKeywords: [
      'emergency tyre fitter',
      'mobile tyre fitter Glasgow',
      'mobile tyre fitting Edinburgh',
    ],
    sections: [
      {
        heading: 'When same-day works',
        body: [
          'For common car and light van sizes already on the van, same-day fitting is usually achievable across the central belt. For unusual sizes or remote locations we will be honest about timing before you pay.',
        ],
      },
      {
        heading: 'How we keep same-day honest',
        body: [
          'We do not promise arrival windows we cannot hit. The quote shows pricing for the conditions at the moment of booking — time of day, weather, travel distance — and dispatch is confirmed on the call.',
        ],
      },
    ],
    faq: [
      {
        question: 'Can you really come the same day?',
        answer:
          'For common sizes in the central belt, usually yes. For remote locations or unusual sizes we will say if same-day is realistic rather than promise and miss.',
      },
      {
        question: 'Is same-day more expensive?',
        answer:
          'It is priced the same as any other call out for that time of day. Out-of-hours and weekend pricing applies separately and is shown in the quote.',
      },
    ],
    relatedServices: ['emergency-tyre-repair', '24-hour-mobile-tyre-fitting', 'mobile-tyre-fitting'],
    relatedLocations: ['glasgow', 'edinburgh', 'paisley', 'hamilton'],
    ctaLabel: 'Quote same-day fitting',
    ctaHref: '/quote',
  },
  {
    slug: 'wheel-balancing',
    title: 'Mobile wheel balancing',
    metaTitle: 'Mobile Wheel Balancing | Vibration & Steering Wobble',
    metaDescription:
      'Mobile wheel balancing for vibration, steering wobble and after pothole strikes. Done on the vehicle, no trip to the garage.',
    heroTitle: 'Mobile wheel balancing on your driveway',
    heroIntro:
      'A vibration through the steering wheel at 50–70 mph is almost always a wheel balance issue. We balance wheels on a mobile balancer at your location — no garage visit, no waiting room.',
    primaryKeywords: [
      'mobile wheel balancing near me',
      'wheel balancing at home Glasgow',
      'mobile tyre balancing Scotland',
      'steering wobble fix',
    ],
    secondaryKeywords: [
      'tyre vibration repair',
      'mobile tyre fitter Glasgow',
    ],
    sections: [
      {
        heading: 'Symptoms of an unbalanced wheel',
        body: [
          'Vibration that rises with speed and peaks around 50–70 mph is the classic symptom. It can also show up as a wobble in the steering wheel or seat. A balance check is a quick first step before chasing more expensive causes.',
        ],
      },
      {
        heading: 'How we balance on site',
        body: [
          'Each wheel comes off in turn, goes onto the mobile balancer, and is set with the correct weights. We refit, torque to spec, and re-check the road feel before we leave.',
        ],
      },
    ],
    faq: [
      {
        question: 'How often should wheels be balanced?',
        answer:
          'Every time a tyre is changed, after a pothole strike or kerb damage, or whenever you notice vibration that was not there before.',
      },
      {
        question: 'Can you balance the spare too?',
        answer:
          'Yes — if it is going to live on the car for any meaningful distance, balancing it is sensible.',
      },
    ],
    relatedServices: ['mobile-tyre-fitting', 'new-tyres-fitted-at-home', 'puncture-repair'],
    relatedLocations: ['glasgow', 'edinburgh', 'paisley', 'east-kilbride'],
    ctaLabel: 'Book wheel balancing',
    ctaHref: '/quote',
  },
  {
    slug: 'tpms-sensor-replacement',
    title: 'TPMS sensor replacement',
    metaTitle: 'Mobile TPMS Sensor Replacement | Tyre Pressure Warning',
    metaDescription:
      'Mobile TPMS sensor replacement for tyre pressure warning lights on car and light van. Diagnostic, replace and re-learn at your location.',
    heroTitle: 'TPMS sensor replacement at your location',
    heroIntro:
      'A persistent tyre pressure warning light usually means a dead TPMS sensor. We diagnose, replace and re-learn at your location — no garage visit needed.',
    primaryKeywords: [
      'TPMS sensor replacement near me',
      'tyre pressure warning light reset',
      'mobile TPMS service Glasgow',
      'TPMS sensor Scotland',
    ],
    secondaryKeywords: [
      'mobile tyre fitter Glasgow',
      'tyre pressure sensor cost',
    ],
    sections: [
      {
        heading: 'When the TPMS light comes on',
        body: [
          'A TPMS light can mean low pressure, a failing sensor, or a programming issue after a tyre change. We test the sensors, identify the failing one, and replace with a quality OE-compatible unit.',
        ],
      },
      {
        heading: 'OE vs aftermarket sensors',
        body: [
          'Many cars take aftermarket programmable sensors that match OE function for less money. For some marques the OE sensor is the cleaner choice and we will say so.',
        ],
      },
    ],
    faq: [
      {
        question: 'How long does a TPMS sensor last?',
        answer:
          'Typically 5–10 years depending on use. The battery is integral, so when it dies the whole sensor is replaced.',
      },
      {
        question: 'Do you reset the TPMS warning after the fix?',
        answer:
          'Yes — re-learn is part of the service. For some vehicles a short drive cycle is needed to complete the re-learn.',
      },
    ],
    relatedServices: ['mobile-tyre-fitting', 'wheel-balancing', 'puncture-repair'],
    relatedLocations: ['glasgow', 'edinburgh', 'paisley', 'hamilton'],
    ctaLabel: 'Quote TPMS replacement',
    ctaHref: '/quote',
  },
  {
    slug: 'locking-wheel-nut-removal',
    title: 'Locking wheel nut removal',
    metaTitle: 'Mobile Locking Wheel Nut Removal | Lost Key Help',
    metaDescription:
      'Mobile locking wheel nut removal when the key is lost, broken or rounded. Safe extraction at your location, replacement nuts supplied.',
    heroTitle: 'Locking wheel nut removal at your location',
    heroIntro:
      'Lost the locking wheel nut key, or stripped the splines? We can remove damaged or keyless locking wheel nuts safely on the driveway, refit a standard or replacement locking set, and document the work.',
    primaryKeywords: [
      'locking wheel nut removal mobile',
      'lost locking wheel nut key help',
      'mobile locking wheel nut Glasgow',
      'remove rounded wheel lock',
    ],
    secondaryKeywords: [
      'mobile tyre fitter Glasgow',
      'wheel nut replacement Scotland',
    ],
    sections: [
      {
        heading: 'When you need a locking wheel nut removed',
        body: [
          'Most call outs are after a key has been lost in a clear-out, or where the previous fitter has over-tightened and rounded the splines. In both cases the nut needs to come off without damaging the alloy.',
        ],
      },
      {
        heading: 'How we remove safely',
        body: [
          'We use the appropriate extraction tool for the nut type and the wheel finish, working slowly to avoid alloy damage. Replacement standard or new locking nuts are supplied as part of the service.',
        ],
      },
    ],
    faq: [
      {
        question: 'Will you damage the alloy?',
        answer:
          'We work to avoid alloy damage but cannot always guarantee zero contact on heavily seized nuts. We will be honest about risk before we start.',
      },
      {
        question: 'Do you supply replacement locking nuts?',
        answer:
          'Yes — replacement nuts are part of the call out, in OE pattern or aftermarket as appropriate.',
      },
    ],
    relatedServices: ['mobile-tyre-fitting', 'new-tyres-fitted-at-home', 'emergency-tyre-repair'],
    relatedLocations: ['glasgow', 'edinburgh', 'paisley', 'hamilton'],
    ctaLabel: 'Quote wheel nut removal',
    ctaHref: '/quote',
  },
  {
    slug: 'caravan-and-trailer-tyres',
    title: 'Caravan and trailer tyres',
    metaTitle: 'Mobile Caravan & Trailer Tyre Fitting | Scotland',
    metaDescription:
      'Mobile caravan, trailer and motorhome tyre fitting at home, depot or storage compound. Correct load-rated tyres, fitted on site.',
    heroTitle: 'Caravan and trailer tyres fitted on site',
    heroIntro:
      'Caravan, trailer and small motorhome tyres need correct load and speed ratings. We fit on the driveway, at storage compounds or before a trip — so the unit is ready to tow.',
    primaryKeywords: [
      'caravan tyre fitter mobile Scotland',
      'trailer tyre replacement mobile',
      'motorhome tyre fitting Scotland',
      'mobile tyre fitter for caravan',
    ],
    secondaryKeywords: [
      'mobile tyre fitter Glasgow',
      'mobile tyre fitting Scotland',
    ],
    sections: [
      {
        heading: 'Why caravan and trailer tyres need care',
        body: [
          'Caravans and trailers spend long periods static and loaded. The tyre may have plenty of tread but be aged, cracked or out of date — all of which fail under towing load. Date code and condition matter as much as tread depth.',
        ],
      },
      {
        heading: 'What we fit',
        body: [
          'Correct load-rated tyres for the unit and the typical loaded weight. We will be honest if a wheel size or access situation is outside the safe scope of mobile work.',
        ],
      },
    ],
    faq: [
      {
        question: 'How old can a caravan tyre be?',
        answer:
          'Most manufacturers recommend replacement at five to seven years regardless of tread. After ten years a caravan tyre should be considered unsafe.',
      },
      {
        question: 'Do you fit at caravan storage compounds?',
        answer:
          'Yes — common across Scotland. We just need access and a contact on site.',
      },
    ],
    relatedServices: ['mobile-tyre-fitting', '4x4-suv-tyres', 'van-tyres'],
    relatedLocations: ['glasgow', 'perth', 'stirling', 'inverness'],
    ctaLabel: 'Quote caravan/trailer tyres',
    ctaHref: '/quote',
  },
  {
    slug: 'all-season-tyres',
    title: 'All-season tyres',
    metaTitle: 'All-Season Tyres Fitted at Home | TyreRepair UK',
    metaDescription:
      'All-season tyres fitted at home across Scotland. One-tyre-all-year cover for drivers who do not want to swap winter and summer rubber.',
    heroTitle: 'All-season tyres fitted on the driveway',
    heroIntro:
      'All-season tyres balance summer dry performance with winter grip. For central-belt drivers who do not see hard snow regularly, they often remove the need for a seasonal swap entirely.',
    primaryKeywords: [
      'all season tyres fitted at home',
      'all weather tyres mobile fitting',
      'all season tyres Glasgow',
      'all season tyres Scotland',
    ],
    secondaryKeywords: [
      'winter tyres fitted at home Scotland',
      'mobile tyre fitter Glasgow',
    ],
    sections: [
      {
        heading: 'When all-season makes sense',
        body: [
          'For drivers who mostly do central-belt commuting and occasional rural routes, a quality all-season tyre handles Scottish weather without the seasonal change-over. For Highland and snow-belt drivers, dedicated winter tyres still win for the worst weeks.',
        ],
      },
      {
        heading: 'Mobile fitting on the driveway',
        body: [
          'We bring the tyres, the equipment and the balancer. The swap to all-season is the same straightforward job as any new tyre fitment.',
        ],
      },
    ],
    faq: [
      {
        question: 'Are all-season tyres legal in winter?',
        answer:
          'Yes — Scotland does not require any specific seasonal tyre. All-season tyres marked with the 3-peak mountain snowflake are recognised winter-capable.',
      },
      {
        question: 'Do all-season tyres wear faster?',
        answer:
          'Slightly. The trade-off is fewer change-overs and balanced performance year-round.',
      },
    ],
    relatedServices: ['winter-tyres', 'mobile-tyre-fitting', 'new-tyres-fitted-at-home'],
    relatedLocations: ['glasgow', 'edinburgh', 'perth', 'inverness'],
    ctaLabel: 'Quote all-season tyres',
    ctaHref: '/quote',
  },
];

export function findServicePage(slug: string): ServicePage | undefined {
  return servicePages.find((s) => s.slug === slug);
}

export const SERVICE_SLUGS: readonly string[] = servicePages.map((s) => s.slug);
