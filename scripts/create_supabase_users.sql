-- Execute como usuário postgres no SQL Editor do Supabase
begin;

create extension if not exists pgcrypto;

with raw_source(name, phone, email, cpf, birthdate, password) as (
  values
    ('Sarita Dubra Paes Rodrigues','11992911753','sadubrapaes@hotmail.com','80227856872','1957-02-20','802278'),
    ('Elizabeth Lourençani Gomes de Pinho','11992391414','elizlpinho@gmail.com','04383817858','1959-03-21','043838'),
    ('Salete Verginia Romero','11994731809','salete.romero@yahoo.com','01149160802','1948-03-08','011491'),
    ('Ana Maria Guimarães Fortes Iapichini','11995926618','iapichini@uol.com.br','61487430868','1946-06-15','614874'),
    ('Luiz Antônio Iapichini','11993080820','iapichini@uol.com.br','66748968887','1949-06-03','667489'),
    ('Clarete Aparecida Castralli','11989617779','clarete.castralli@gmail.com','63524775853','1951-09-29','635247'),
    ('Joaquina Mendes Almeida','11991815706','jo_rocha18@hotmail.com','67185975891','1956-06-18','671859'),
    ('Maria Bernadete do Amaral Buontempo','11997629779','bernabuon@terra.com.br','90475127820','1955-05-26','904751'),
    ('Vera Adorinda Pinto Arantes','11992527147','verantes@hotmail.com','28113802800','1950-09-01','281138'),
    ('Teresinha Margarida Rodrigues Sales','11989640946','teresinhamrs@hotmail.com','80209602872','1943-07-29','802096'),
    ('Maria de Lourdes Ferreira Prado','11970510187','maluprado05@gmail.com','37035274804','1947-05-29','370352'),
    ('Maria Edilene da Silva','11988075013','medilene33@yahoo.com.br','04509542852','1961-02-21','045095'),
    ('Cleide Trevizan Franco de Souza','11972659003','cleidetfs54@gmail.com','81195370849','1954-11-24','811953'),
    ('Leila Vasconcelos Rodrigues','12988471407','leilaroiz@uol.com.br','18571457808','1952-01-14','185714'),
    ('Cecilia Maria Rebelo Domingues de Freitas','11991046631','cilita@uol.com.br','04219013814','1953-04-14','042190'),
    ('Floripes Santos Margarido','12997037373','flormargarido@gmail.com','20781008891','1948-11-27','207810'),
    ('Alvaro Caldas da Cunha Margarido','12997124812','alvaromargarido@yahoo.com.br','00154997820','1936-04-02','001549'),
    ('Maria Aparecida Borges de Lima Oliveira','19998151517','mariaoliveira@gmail.com','01624545890','1959-03-05','016245'),
    ('Sonia Maria da Costa','11971813057','diamante302@yahoo.com.br','75462397887','1954-04-02','754623'),
    ('Solange Fraga Constantino','11992306633','solangefrancoc@gmail.com','62943677787','1957-05-09','629436'),
    ('Maria Ernesta Lopes Dos Reis','11986961424','mariaernesta46@gmail.com','01159633835','1960-10-23','011596'),
    ('Katia Maria Carajileascov','11996294188','katia@produmed.com.br','12634120842','1962-09-20','126341'),
    ('Rita De Cassia Martins Melo','11993718040','ritamarrm22@gmail.com','02336833808','1965-05-22','023368'),
    ('Ione Anselmo Cosmo','11987705747','ione.ac@gmail.com','89241827815','1957-12-19','892418'),
    ('Dalzima Lima de Oliveira','11998332336','bizzioliveira@gmail.com','09880267834','1948-02-02','098802'),
    ('Dalva Sakae Iwamoto de Araujo','11994576770','dalvaiwamoto@gmail.com','72659688834','1951-01-26','726596'),
    ('Renate Camilla Carreira','11999541611','renate.carreira@gmail.com','00613391802','1944-03-29','006133'),
    ('Maria Cristina Freitas de Magalhães','11995514857','cristina_magalha@uol.com.br','94881812815','1959-02-10','948818'),
    ('Regina Maria Francelina Themudo','11974141625','ccategero82@gmail.com','08615758816','1964-03-17','086157'),
    ('Virginia Soares Fachini','11972692393','vivi.fachini@gmail.com','63825201872','1947-07-10','638252'),
    ('Maria Carolina Ferraz de Pasten','11998749009','lina10107@yahoo.com.br','98924095820','1957-10-10','989240'),
    ('Solange Rodrigues','11988099122','solangecarnevalli@hotmail.com','08870369889','1967-09-27','088703'),
    ('Ana Maria Mello Isern','11996136400','anamariamello26@gmail.com','08797235806','1961-08-26','087972'),
    ('Marcia de Mello Mendonça','11975414849','mamendosp@gmail.com','01471052850','1958-09-06','014710'),
    ('Luciene Moraes Taurisano','11984643484','lugm907@hotmail.com','04693697877','1958-11-08','046936'),
    ('Marilene Martins','11984301095','marilenemartins3@gmail.com','07441420830','1966-01-17','074414'),
    ('Selma Aparecida Fernandes','11996829198','selmapfernandes@yahoo.com.br','04613781833','1957-09-10','046137'),
    ('Vera Regina Monteiro de Barros','11997676400','barrosverar@gmail.com','94541604868','1947-12-29','945416'),
    ('Elisabeth Christine Marguerite Germaine Mullet','11945331933','bethmullet@gmail.com','01170441807','1957-12-19','011704'),
    ('Claudia Santos de Menezes','21999380626','claudiamfig@gmail.com','78355770706','1963-10-05','783557'),
    ('Sidney Rodrigues','11992911753','sadubrapaes@hotmail.com','61855600897','1954-11-16','618556'),
    ('Ana Lucia Lopes de Sousa','11979540778','luciazoza@gmail.com','68644647768','1962-03-11','686446'),
    ('Marta Del Valhe','11996512234','martadelvalhe@uol.com.br','01068811838','1960-09-05','010688'),
    ('Rute Gomes Segarra','14997434704','rutesegarra@gmail.com','79391818820','1954-09-27','793918'),
    ('Denise Cecilia Mello Rocha Campos','11999884193','denisececi@yahoo.com.br','11607210843','1964-01-08','116072'),
    ('Magaly Maria Ramos','11945935868','mag.ramos55@gmail.com','00327833882','1955-10-27','003278'),
    ('Vera Lucia Santos da Silva Barbosa','11997402704','veralssb@gmail.com','12660866848','1968-04-23','126608'),
    ('Abílio José Barbosa','11997402704','veralssb@gmail.com','07515186895','1966-01-01','075151'),
    ('Pedro Reinaldo Barbosa','11996136050','debora.pisapio@hotmail.com','96302160863','1957-06-29','963021'),
    ('Débora Maria Pisapio Barbosa','11999256065','debora.pisapio@hotmail.com','01602303819','1959-01-19','016023'),
    ('Eloiza Machado Pinto Rodrigues','11988229797','eloiza.machado@bol.com.br','00132316773','1944-06-02','001323'),
    ('Francisco Rodrigues','11991978000','fcorodrigues15@hotmail.com','02934965791','1943-09-03','029349'),
    ('Efigênia Maria Pavan','11979762145','empavan@icloud.com','27398723806','1955-04-28','273987'),
    ('Sergio Carlos Panigassi','11963520177','panega1@hotmail.com','05423864887','1944-12-16','054238'),
    ('Sueli Teresinha de Candido Panigassi','11963520177','panega1@hotmail.com','60921994834','1948-05-24','609219'),
    ('Ednamaira de Oliveira Guerra','11996478996','mairaednaguerra@gmail.com','04980208860','1954-04-20','049802'),
    ('Sonia Regina Nunes','11973765007','soniahito@gmail.com','21370292864','1956-10-25','213702'),
    ('Wania Martins Rancan','11996431018','waniarancan@gmail.com','57146772853','1953-12-30','571467'),
    ('Ana Maria Alexandre Dos Santos','11996266594','nanaalexandre58@gmail.com','85594270825','1958-01-25','855942'),
    ('Solange de Oliveira Rosalin','11997858134','solangeorosalin7@gmail.com','08681853880','1966-04-10','086818'),
    ('Dineia Guerra','13981101144','dineiaguerra@gmail.com','80245986804','1953-08-27','802459'),
    ('Elisabeth Pestalozzi','11991850362','lisapestalozzi@yahoo.com','01257551809','1957-03-10','012575'),
    ('Helle Nice Mendes Villas Boas Pizzo','11995702497','pizzoah@gmail.com','64205070810','1951-11-16','642050'),
    ('Antonio Pizzo','11991542479','pizzoah@gmail.com','95314601834','1958-06-13','953146'),
    ('Elza Santana','11982992033','elza.vitali@gmail.com','02344665889','1955-12-26','023446'),
    ('Nadia Cristina de Souza Lopes','11974190944','crisnasoni@hotmail.com','04173958846','1962-12-20','041739'),
    ('Ivone Luzeti Turqui','11983777811','ivoninha49@yahoo.com.br','32222589886','1949-08-04','322225'),
    ('Licinia Vaz Fernandes','11997880750','liciniavf@hotmail.com','28115197858','1952-07-20','281151'),
    ('Dirlene Candia Ferreira da Cruz','11984440748','dirlenecandia@gmail.com','01435215869','1961-05-03','014352'),
    ('José Arnaldo Pereira dos Santos','11988602922','jarnaldo717@uol.com.br','10742557804','1943-11-04','107425'),
    ('Silvia Bolanho de Macedo','11960604634','silviabolanho457@gmail.com','03704407810',null,''),
    ('Cinthia Luzeti Turqui','11983777811','ivoninha49@yahoo.com.br','26757199866','1977-07-15',''),
    ('Ivete Soares dos Santos','1198169319','dossantosivete6@gmail.com','16530245855','1942-11-15',''),
    ('Lucia Elena Nogueira Rocha','11976536588','lucia.nogueirarocha@gmail.com','86716190872','1953-12-27',''),
    ('Claudia De Vasconcellos L Da Costa','11985585858','calau60@gmail.com','07548140843','1946-01-23',''),
    ('Solange Valls Faroli da Rosa','11960604634','solange.valls@gmail.com','04733859880','1963-04-19',''),
    ('Edimara Andrade Monteiro','11972886167','maraam@me.com','10386830843','1963-04-09',''),
    ('Adriana Mattar','11988604544','mattaradriana97@gmail.com','11206193867','1966-05-14','')
), dedup_source as (
  select distinct on (lower(email))
    name, phone, email, cpf, birthdate, password
  from raw_source
  order by lower(email), name
), numbered_source as (
  select
    d.*,
    row_number() over (partition by nullif(d.phone, '') order by lower(d.email), d.name) as phone_rank
  from dedup_source d
), source as (
  select
    name,
    case when nullif(phone, '') is null then null else phone end as raw_phone,
    case
      when nullif(phone, '') is null then null
      when phone_rank = 1 then regexp_replace(phone, '\D', '', 'g')
      else null
    end as phone,
    email,
    regexp_replace(cpf, '\D', '', 'g') as cpf,
    case
      when nullif(birthdate, '') is null then null
      else to_date(birthdate, 'YYYY-MM-DD')
    end as birthdate,
    password
  from numbered_source
), repaired as (
  update auth.users u
  set
    confirmation_token = coalesce(u.confirmation_token, ''),
    recovery_token = coalesce(u.recovery_token, ''),
    email_change = coalesce(u.email_change, ''),
    email_change_token_current = coalesce(u.email_change_token_current, ''),
    email_change_token_new = coalesce(u.email_change_token_new, ''),
    phone_change_token = coalesce(u.phone_change_token, ''),
    reauthentication_token = coalesce(u.reauthentication_token, ''),
    email_confirmed_at = coalesce(u.email_confirmed_at, now()),
    confirmation_sent_at = coalesce(u.confirmation_sent_at, now())
  from source s
  where lower(u.email) = lower(s.email)
    and (
      u.confirmation_token is null
      or u.recovery_token is null
      or u.email_change is null
      or u.email_change_token_current is null
      or u.email_change_token_new is null
      or u.phone_change_token is null
      or u.reauthentication_token is null
      or u.email_confirmed_at is null
      or u.confirmation_sent_at is null
    )
  returning u.id, u.email
), inserted as (
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at,
    last_sign_in_at, created_at, updated_at, phone, raw_user_meta_data, raw_app_meta_data, email_change,
    confirmation_token, recovery_token, email_change_token_current, email_change_token_new, phone_change_token, reauthentication_token
  )
  select
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    s.email,
    crypt(coalesce(nullif(s.password, ''), s.cpf), gen_salt('bf')),
    now(),
    now(),
    null,
    now(),
    now(),
    s.phone,
    jsonb_build_object('name', s.name, 'cpf', s.cpf, 'phone', coalesce(s.raw_phone, s.phone), 'birthdate', s.birthdate),
    jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
    '',
    '', '', '', '', '', ''
  from source s
  where not exists (
    select 1 from auth.users u where lower(u.email) = lower(s.email)
  )
  returning id, email
), target_user as (
  select id, email from inserted
  union all
  select id, email from repaired
  union all
  select u.id, u.email
  from auth.users u
  join source s on lower(s.email) = lower(u.email)
  where not exists (select 1 from inserted i where i.id = u.id)
    and not exists (select 1 from repaired r where r.id = u.id)
), profiles_upsert as (
  insert into public.profiles (id, email, name, whatsapp, cpf, data_nasc)
  select
    t.id,
    s.email,
    s.name,
    s.phone,
    s.cpf,
    s.birthdate
  from target_user t
  join source s on lower(s.email) = lower(t.email)
  on conflict (cpf) do update
    set id = excluded.id,
        email = excluded.email,
        name = excluded.name,
        whatsapp = excluded.whatsapp,
        data_nasc = excluded.data_nasc
  returning id
)
insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
select gen_random_uuid(), id, jsonb_build_object('sub', id::text, 'email', email), 'email', email, now(), now()
from target_user
on conflict (provider, provider_id) do nothing;

commit;
