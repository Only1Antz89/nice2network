import postgres from "postgres";

const mode = process.argv[2];
if (!['seed', 'purge', 'status'].includes(mode)) {
  console.error('Usage: node scripts/demo-content.mjs <seed|purge|status>');
  process.exit(1);
}

const connection = process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
if (!connection) throw new Error('Set DATABASE_URL_UNPOOLED or POSTGRES_URL before running demo content commands.');
const sql = postgres(connection, { ssl: 'require', max: 1, prepare: false });
const DEMO_ROLE = 'demo_member';
const DEMO_DOMAIN = 'demo.nice2network.test';

const people = [
  ['d2000000-0000-4000-8000-000000000001','Maya Chen','maya','Product Designer','Design & public services','Product design','User research','Service design',['Climate action','Public services','Accessible technology'],'London','United Kingdom','hybrid','Designing useful services with communities, not merely for them.'],
  ['d2000000-0000-4000-8000-000000000002','Marcus Okafor','marcus','Clean Energy Founder','Climate & energy','Energy strategy','Community ownership','Financial modelling',['Clean energy','Local resilience','Cooperatives'],'London','United Kingdom','hybrid','Building practical routes to shared, affordable neighbourhood energy.'],
  ['d2000000-0000-4000-8000-000000000003','Lena Vogt','lena','Brand Strategist','Creative industries','Brand strategy','Community launch','Storytelling',['Purposeful brands','Climate','Public good'],'London','United Kingdom','hybrid','Helping early ideas become clear stories people want to join.'],
  ['d2000000-0000-4000-8000-000000000004','Dev Shah','dev','Full-stack Engineer','Technology','Software development','React','Cloud infrastructure',['Open source','Climate tech','Civic technology'],'Manchester','United Kingdom','remote','Full-stack engineer focused on dependable tools for small, ambitious teams.'],
  ['d2000000-0000-4000-8000-000000000005','Ali Rahman','ali','Operations Lead','Community & nonprofit','Operations','Partnerships','Project management',['Social enterprise','Food systems','Neighbourhoods'],'London','United Kingdom','hybrid','Turning promising community concepts into pilots that actually run.'],
  ['d2000000-0000-4000-8000-000000000006','Sofia Reyes','sofia','Urban Planner','Design & public services','Urban planning','Community consultation','Place strategy',['Night-time economy','Public space','Culture'],'London','United Kingdom','in_person','Exploring how overlooked places can become safer, more useful and more social.'],
  ['d2000000-0000-4000-8000-000000000007','Jordan Lee','jordan','Community Builder','Community & nonprofit','Community building','Facilitation','Volunteer programmes',['Youth opportunity','Arts','Local networks'],'Bristol','United Kingdom','hybrid','Creating welcoming networks where people can contribute something real.'],
  ['d2000000-0000-4000-8000-000000000008','Amara Bennett','amara','Finance & Growth Adviser','Finance','Financial planning','Fundraising','Growth strategy',['Startups','Circular economy','Founder support'],'London','United Kingdom','remote','Helping purpose-led founders build credible numbers and sustainable routes to growth.'],
  ['d2000000-0000-4000-8000-000000000009','Noah Williams','noah','Mobile Engineer','Technology','Mobile development','React Native','API development',['Weather','Accessibility','Open data'],'Manchester','United Kingdom','remote','Mobile engineer who enjoys turning public data into calm, reliable products.'],
  ['d2000000-0000-4000-8000-000000000010','Priya Nair','priya','Food Systems Researcher','Food & hospitality','Food systems','Research','Impact measurement',['Food waste','Circular economy','Community kitchens'],'Birmingham','United Kingdom','hybrid','Researching practical ways for cities to waste less food and share more value.'],
  ['d2000000-0000-4000-8000-000000000011','Elena Moore','elena','Materials Scientist','Manufacturing','Materials science','Circular design','Supply chains',['Repair','Circular materials','Local manufacturing'],'Leeds','United Kingdom','hybrid','Turning material research into practical circular products and supply chains.'],
  ['d2000000-0000-4000-8000-000000000012','Kwame Boateng','kwame','Documentary Producer','Creative industries','Documentary production','Story development','Community interviewing',['Local history','Culture','Public storytelling'],'London','United Kingdom','hybrid','Producing careful stories that preserve local knowledge and bring new audiences into it.'],
  ['d2000000-0000-4000-8000-000000000013','Hannah Clarke','hannah','Learning Programme Designer','Education','Programme design','Learning experience','Employer partnerships',['Apprenticeships','Career access','Inclusive hiring'],'Glasgow','United Kingdom','remote','Designing clearer routes into meaningful work for people overlooked by traditional recruitment.'],
];

const projects = [
  {id:'d3000000-0000-4000-8000-000000000001',owner:people[1][0],title:'Neighbourhood energy, shared fairly',summary:'A toolkit that helps one street buy, share and understand clean energy together. The pilot needs a product thinker, a community voice and someone who can make the numbers work.',industry:'Climate & energy',stage:'planning',accent:'#ff6b35',city:'London',mode:'hybrid',roles:[['Product designer','Design',['Product design','User research']],['Community growth lead','Growth',['Community launch','Partnerships']],['Finance modeller','Finance',['Financial modelling']]]},
  {id:'d3000000-0000-4000-8000-000000000002',owner:people[5][0],title:'Make empty city spaces useful after dark',summary:'A lightweight way for local groups to find and book underused spaces for classes, studios and community dinners, with access and safety built in.',industry:'Community & nonprofit',stage:'idea',accent:'#5577ff',city:'London',mode:'in_person',roles:[['Venue partnerships lead','Partnerships',['Partnerships','Stakeholder management']],['Finance lead','Finance',['Financial planning']],['Community safety adviser','Operations',['Safeguarding']]]},
  {id:'d3000000-0000-4000-8000-000000000003',owner:people[0][0],title:'Weather, without the noise',summary:'A calm, accessible weather app that translates forecasts into useful decisions for people commuting, caring and working outside.',industry:'Technology',stage:'building',accent:'#45a6a6',city:'London',mode:'remote',roles:[['Mobile engineer','Engineering',['Mobile development','React Native']],['Backend engineer','Engineering',['API development','Cloud infrastructure']],['QA engineer','Quality',['Software testing','Accessibility testing']]]},
  {id:'d3000000-0000-4000-8000-000000000004',owner:people[9][0],title:'Surplus supper network',summary:'Connect independent food businesses with community kitchens before good ingredients become waste, starting with one Birmingham district.',industry:'Food & hospitality',stage:'planning',accent:'#d9a441',city:'Birmingham',mode:'hybrid',roles:[['Logistics coordinator','Operations',['Logistics','Operations']],['Partnerships manager','Partnerships',['Partnerships']],['Service designer','Design',['Service design']]]},
  {id:'d3000000-0000-4000-8000-000000000005',owner:people[6][0],title:'First project, first reference',summary:'A short, supported programme where early-career members contribute to a real community brief and leave with evidence of their work.',industry:'Community & nonprofit',stage:'idea',accent:'#8b6ccf',city:'Bristol',mode:'hybrid',roles:[['Programme designer','Programme',['Programme design','Facilitation']],['Employer partnerships lead','Partnerships',['Partnerships']],['Impact evaluator','Research',['Impact measurement']]]},
  {id:'d3000000-0000-4000-8000-000000000006',owner:people[7][0],title:'Circular founders clinic',summary:'Monthly working rooms where circular-economy founders solve one commercial blocker with finance, product and industry specialists.',industry:'Finance',stage:'launching',accent:'#171715',city:'London',mode:'hybrid',roles:[['Founder facilitator','Community',['Facilitation']],['Circular economy specialist','Strategy',['Circular economy']],['Partnerships producer','Partnerships',['Partnerships','Event production']]]},
  {id:'d3000000-0000-4000-8000-000000000007',owner:people[10][0],title:'The repairable product library',summary:'An open catalogue that helps small manufacturers choose repairable parts, reversible joins and lower-waste materials before production begins.',industry:'Manufacturing',stage:'building',accent:'#20a477',city:'Leeds',mode:'remote',roles:[['Product engineer','Engineering',['Product engineering','CAD']],['Technical writer','Content',['Technical writing']],['Manufacturer partnerships lead','Partnerships',['Supply chains','Partnerships']]]},
  {id:'d3000000-0000-4000-8000-000000000008',owner:people[12][0],title:'Skills-first apprenticeship matcher',summary:'A fairer apprenticeship discovery service that matches practical strengths and interests to employers without relying on polished CV language.',industry:'Education',stage:'planning',accent:'#e55b91',city:'Glasgow',mode:'remote',roles:[['Assessment designer','Research',['Assessment design']],['Employer partnerships manager','Partnerships',['Employer partnerships']],['Data ethics adviser','Governance',['Data ethics']]]},
  {id:'d3000000-0000-4000-8000-000000000009',owner:people[11][0],title:'The living high street archive',summary:'A community-owned collection of short films and oral histories capturing independent shops, skills and neighbourhood memories before they disappear.',industry:'Creative industries',stage:'idea',accent:'#bc6b37',city:'London',mode:'in_person',roles:[['Archive producer','Production',['Archive production']],['Community researcher','Research',['Community interviewing']],['Digital experience designer','Design',['Digital storytelling']]]},
  {id:'d3000000-0000-4000-8000-000000000010',owner:people[9][0],title:'Neighbourhood pantry map',summary:'A live map connecting surplus ingredients, community fridges and low-cost cooking sessions so residents can find useful food support nearby.',industry:'Food & hospitality',stage:'building',accent:'#8a9c3c',city:'Birmingham',mode:'hybrid',roles:[['Mapping engineer','Technology',['Geospatial development']],['Community organiser','Community',['Community outreach']],['Food safety lead','Operations',['Food safety']]]},
];

async function seed() {
  await sql.begin(async tx => {
    for (const [id,name,slug,profession,industry,primary,secondary,tertiary,interests,city,country,workMode,bio] of people) {
      await tx`insert into users (id,name,first_name,last_name,email,email_verified,age_band,profession,headline,bio,industry,primary_skill,secondary_skill,tertiary_skill,skills,interests,location,city,country,timezone,work_mode,availability,role,status,onboarding_completed_at)
        values (${id},${name},${name.split(' ')[0]},${name.split(' ').slice(1).join(' ')},${`${slug}@${DEMO_DOMAIN}`},now(),'adult',${profession},${`${profession} · ${city}`},${bio},${industry},${primary},${secondary},${tertiary},${[primary,secondary,tertiary]},${interests},${`${city}, ${country}`},${city},${country},'Europe/London',${workMode},'open',${DEMO_ROLE},'active',now())
        on conflict (id) do update set name=excluded.name, profession=excluded.profession, headline=excluded.headline, bio=excluded.bio, industry=excluded.industry, primary_skill=excluded.primary_skill, secondary_skill=excluded.secondary_skill, tertiary_skill=excluded.tertiary_skill, skills=excluded.skills, interests=excluded.interests, city=excluded.city, country=excluded.country, work_mode=excluded.work_mode, role=${DEMO_ROLE}, status='active', updated_at=now()`;
      await tx`insert into privacy_settings (user_id,profile_visibility,message_permission,show_location,show_availability,use_activity_for_matching,allow_introductions) values (${id},'network','connections',true,true,true,true) on conflict (user_id) do nothing`;
      await tx`insert into career_history (id,user_id,title,company,location,start_date,current,description,sort_order) values (${`d4000000-0000-4000-8000-${id.slice(-12)}`},${id},${profession},${slug==='maya'?'Common Thread Studio':slug==='dev'?'Northstar Labs':slug==='sofia'?'City Futures':'Independent'},${city},'2022-01-01',true,${bio},0) on conflict (id) do nothing`;
      await tx`insert into education_history (id,user_id,institution,qualification,field_of_study,start_year,end_year,sort_order) values (${`d5000000-0000-4000-8000-${id.slice(-12)}`},${id},${city==='London'?'University of London':'n2 Professional Institute'},'Professional qualification',${primary},2016,2019,0) on conflict (id) do nothing`;
    }

    for (let pIndex=0;pIndex<projects.length;pIndex++) {
      const p=projects[pIndex];
      await tx`insert into projects (id,owner_id,title,summary,description,industry,stage,status,visibility,location,city,country,timezone,work_mode,allow_remote_fallback,accent,created_at,updated_at)
        values (${p.id},${p.owner},${p.title},${p.summary},${`Demonstration project · n2 demo batch 2026-08 · ${p.summary}`},${p.industry},${p.stage},'active','network',${`${p.city}, United Kingdom`},${p.city},'United Kingdom','Europe/London',${p.mode},true,${p.accent},${new Date(Date.now()-(pIndex+1)*9*3600000)},now())
        on conflict (id) do update set title=excluded.title,summary=excluded.summary,description=excluded.description,industry=excluded.industry,stage=excluded.stage,status='active',visibility='network',updated_at=now()`;
      await tx`insert into project_members (project_id,user_id,membership_role,department) values (${p.id},${p.owner},'owner','Leadership') on conflict do nothing`;
      for (let rIndex=0;rIndex<p.roles.length;rIndex++) {
        const [title,department,skills]=p.roles[rIndex];
        const roleId=`d6000000-${String(pIndex+1).padStart(4,'0')}-4000-8000-${String(rIndex+1).padStart(12,'0')}`;
        await tx`insert into project_roles (id,project_id,title,department,description,skills,professions,required_skills,useful_skills,phase,criticality,work_mode,reason,capacity,filled,status)
          values (${roleId},${p.id},${title},${department},${`Help ${p.title} reach its next milestone.`},${skills},${[title]},${skills},${[]},${rIndex===0?'now':rIndex===1?'next':'later'},${rIndex===0?'critical':'important'},${p.mode},${`This contribution closes a practical gap in ${p.title}.`},1,0,'open') on conflict (id) do nothing`;
      }
      const milestoneTitles=['Agree the pilot outcome','Run the first working session','Review evidence and next steps'];
      for (let m=0;m<3;m++) await tx`insert into milestones (id,project_id,title,status,sort_order,due_at) values (${`d7000000-${String(pIndex+1).padStart(4,'0')}-4000-8000-${String(m+1).padStart(12,'0')}`},${p.id},${milestoneTitles[m]},${m===0?'completed':'planned'},${m},${new Date(Date.now()+(m+1)*14*86400000)}) on conflict (id) do nothing`;
      await tx`insert into project_updates (id,project_id,author_id,type,body,created_at) values (${`d8000000-${String(pIndex+1).padStart(4,'0')}-4000-8000-000000000001`},${p.id},${p.owner},'update',${pIndex%2?'The first partner conversation is booked. We are refining the pilot brief now.':'The project map is taking shape. We are looking for one practical contribution to unlock the next step.'},${new Date(Date.now()-(pIndex+1)*5*3600000)}) on conflict (id) do nothing`;
    }

    const contributors=[people[0][0],people[2][0],people[3][0],people[4][0],people[6][0],people[8][0],people[9][0],people[7][0]];
    for (let i=0;i<projects.length;i++) {
      const eligibleContributors=contributors.filter(id=>id!==projects[i].owner);
      for (let e=0;e<Math.min(8,3+i);e++) await tx`insert into project_eyes (project_id,user_id,created_at) values (${projects[i].id},${eligibleContributors[(i+e)%eligibleContributors.length]},${new Date(Date.now()-(e*8+i)*3600000)}) on conflict do nothing`;
      for (let c=0;c<2;c++) {
        const author=contributors[(i+c+2)%contributors.length];
        const body=c===0?'This is exactly the kind of focused project I joined n2 to find. Happy to share a useful introduction.':'The outcome feels clear. Which contribution would make the biggest difference this month?';
        await tx`insert into project_comments (id,project_id,author_id,body,status,created_at) values (${`d9000000-${String(i+1).padStart(4,'0')}-4000-8000-${String(c+1).padStart(12,'0')}`},${projects[i].id},${author},${body},'visible',${new Date(Date.now()-(c+i+1)*3600000)}) on conflict (id) do nothing`;
      }
    }
    await tx`insert into meetings (id,project_id,created_by,provider,title,description,starts_at,ends_at,timezone,join_url,location,attendees) values
      ('da000000-0000-4000-8000-000000000001',${projects[0].id},${people[1][0]},'n2','Clean energy pilot: first working session','Agree the street pilot and immediate owner actions',now()+interval '2 days',now()+interval '2 days 45 minutes','Europe/London','/meet/da000000-0000-4000-8000-000000000001','Online',${JSON.stringify([])}::jsonb),
      ('da000000-0000-4000-8000-000000000002',${projects[1].id},${people[5][0]},'in_person','Creative collisions · Shoreditch','A small cross-industry networking room',now()+interval '5 days',now()+interval '5 days 90 minutes','Europe/London',null,'Shoreditch, London',${JSON.stringify([])}::jsonb)
      on conflict (id) do update set provider=excluded.provider,title=excluded.title,description=excluded.description,starts_at=excluded.starts_at,ends_at=excluded.ends_at,join_url=excluded.join_url,location=excluded.location`;
    await tx`insert into timeline_posts (id,author_id,body,linked_project_ids,video_url,visibility,status,created_at) values
      ('db000000-0000-4000-8000-000000000001',${people[2][0]},'A useful brand is a shared promise, not just a logo. I am collecting examples of communities that made a complex climate idea feel genuinely joinable. #neighbourhood-energy-shared-fairly',${[projects[0].id]}::uuid[],null,'network','visible',now()-interval '3 hours'),
      ('db000000-0000-4000-8000-000000000002',${people[3][0]},'What would a weather app look like if calm was one of its product requirements? I have been prototyping an accessibility-first forecast card. #weather-without-the-noise',${[projects[2].id]}::uuid[],'https://vimeo.com/76979871','network','visible',now()-interval '7 hours'),
      ('db000000-0000-4000-8000-000000000003',${people[4][0]},'Small pilots become real when somebody names the awkward operational questions early. Happy to compare launch checklists with anyone working on local food systems. #surplus-supper-network',${[projects[3].id]}::uuid[],null,'network','visible',now()-interval '11 hours'),
      ('db000000-0000-4000-8000-000000000004',${people[10][0]},'Repairability is a design decision made long before anything breaks. I am mapping the components and joining methods small makers can actually source. #the-repairable-product-library',${[projects[6].id]}::uuid[],null,'network','visible',now()-interval '14 hours'),
      ('db000000-0000-4000-8000-000000000005',${people[12][0]},'A strong apprenticeship application should reveal how somebody learns and solves problems, not how confidently they write corporate phrases. #skills-first-apprenticeship-matcher',${[projects[7].id]}::uuid[],null,'network','visible',now()-interval '18 hours'),
      ('db000000-0000-4000-8000-000000000006',${people[11][0]},'Today a shopkeeper showed me a hand-painted price board used by three generations of the same family. These ordinary artefacts hold extraordinary local memory. #the-living-high-street-archive',${[projects[8].id]}::uuid[],null,'network','visible',now()-interval '22 hours'),
      ('db000000-0000-4000-8000-000000000007',${people[9][0]},'Community food support is often hard to discover precisely when somebody needs it. We are testing whether one calm neighbourhood map can change that. #neighbourhood-pantry-map',${[projects[9].id]}::uuid[],null,'network','visible',now()-interval '26 hours')
      on conflict (id) do nothing`;
    const demoReplyPairs=[
      ['That framing is useful. I would test it with one street before trying to explain the whole model.','I can share a community launch checklist that worked well for a similar pilot.'],
      ['Calm is a real product requirement. Could the card lead with the decision someone needs to make?','I would be happy to test the React Native version with screen-reader users.'],
      ['The awkward questions are usually where the useful work begins. Do you already have a food-safety partner?','I can introduce a community kitchen in Birmingham that may be open to a small trial.'],
      ['Would the library include a simple repairability score for each joining method?','This could be genuinely useful to small makers if sourcing lead times are visible too.'],
      ['Could applicants show evidence through a short practical task instead of a written statement?','I like the skills-first approach. Employer guidance will matter just as much as the candidate experience.'],
      ['That price board sounds like a perfect first story. Is the archive collecting audio alongside film?','I can help shape a consent process that still feels human and welcoming.'],
      ['A postcode-level search could make the map immediately useful without exposing precise household locations.','Happy to compare food-support datasets and flag where the gaps are.'],
    ];
    for(let i=0;i<7;i++){
      const postId=`db000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`;
      for(let c=0;c<2;c++){
        const author=people[(i+c+4)%people.length][0];
        await tx`insert into post_replies (id,post_id,author_id,body,status,is_demo,created_at) values (${`dc000000-${String(i+1).padStart(4,'0')}-4000-8000-${String(c+1).padStart(12,'0')}`},${postId},${author},${demoReplyPairs[i][c]},'visible',true,now()-(${i*3+c+1} || ' hours')::interval) on conflict (id) do update set body=excluded.body,status='visible',is_demo=true`;
      }
      for(let l=0;l<Math.min(6,3+i);l++){
        const member=people[(i+l+2)%people.length][0];
        await tx`insert into post_likes (post_id,user_id,is_demo,created_at) values (${postId},${member},true,now()-(${i+l+1} || ' hours')::interval) on conflict (post_id,user_id) do update set is_demo=true`;
      }
      for(let r=0;r<(i%3);r++){
        const member=people[(i+r+7)%people.length][0];
        await tx`insert into post_reposts (post_id,user_id,is_demo,created_at) values (${postId},${member},true,now()-(${i+r+2} || ' hours')::interval) on conflict (post_id,user_id) do update set is_demo=true`;
      }
    }
  });
}

async function purge() {
  const ids=people.map(p=>p[0]), projectIds=projects.map(p=>p.id);
  await sql.begin(async tx => {
    await tx`delete from post_reposts where is_demo = true`;
    await tx`delete from post_likes where is_demo = true`;
    await tx`delete from post_replies where is_demo = true`;
    await tx`delete from audit_log where actor_id = any(${ids}::uuid[]) or target_id = any(${[...ids,...projectIds]}::text[])`;
    await tx`delete from meetings where created_by = any(${ids}::uuid[]) or project_id = any(${projectIds}::uuid[])`;
    await tx`delete from official_notices where author_id = any(${ids}::uuid[])`;
    await tx`delete from sanctions where issued_by = any(${ids}::uuid[]) or revoked_by = any(${ids}::uuid[]) or user_id = any(${ids}::uuid[])`;
    await tx`delete from reports where reporter_id = any(${ids}::uuid[]) or assigned_to = any(${ids}::uuid[])`;
    await tx`delete from invitations where invited_by = any(${ids}::uuid[]) or invitee_id = any(${ids}::uuid[]) or project_id = any(${projectIds}::uuid[])`;
    await tx`delete from projects where id = any(${projectIds}::uuid[])`;
    await tx`delete from users where role = ${DEMO_ROLE} and email like ${`%@${DEMO_DOMAIN}`}`;
  });
}

async function status() {
  const [row]=await sql`select (select count(*)::int from users where role=${DEMO_ROLE} and email like ${`%@${DEMO_DOMAIN}`}) as members,(select count(*)::int from projects where description like 'Demonstration project · n2 demo batch 2026-08%') as projects,(select count(*)::int from project_comments where id::text like 'd9000000-%') as comments,(select count(*)::int from meetings where id::text like 'da000000-%') as meetings,(select count(*)::int from timeline_posts where id::text like 'db000000-%') as posts,(select count(*)::int from post_replies where is_demo=true) as post_replies,(select count(*)::int from post_likes where is_demo=true) as post_likes,(select count(*)::int from post_reposts where is_demo=true) as post_reposts`;
  console.log(JSON.stringify(row));
}

try {
  if (mode==='seed') await seed();
  if (mode==='purge') await purge();
  await status();
} finally { await sql.end(); }
