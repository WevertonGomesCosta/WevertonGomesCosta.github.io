(function (root, factory) {
    'use strict';

    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProfileTranslationInterpolator = api;
    }
}(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    const PROFILE_PLACEHOLDER_RE = /\{(profile_[a-z0-9_]+)\}/g;

    const PLACEHOLDER_NAMES = Object.freeze([
        'profile_person_name',
        'profile_display_name',
        'profile_email',
        'profile_city',
        'profile_region',
        'profile_org_ufv_name',
        'profile_org_ufv_short',
        'profile_org_embrapa_name',
        'profile_org_embrapa_short',
        'profile_org_cnpq_name',
        'profile_org_cnpq_short',
        'profile_org_fapemig_name',
        'profile_org_fapemig_short',
        'profile_org_conecta_name',
        'profile_edu_phd_stat_start_year',
        'profile_edu_phd_stat_end_label',
        'profile_edu_phd_gen_start_year',
        'profile_edu_phd_gen_end_year',
        'profile_edu_msc_start_year',
        'profile_edu_msc_end_year',
        'profile_edu_bsc_start_year',
        'profile_edu_bsc_end_year',
        'profile_aff_postdoc_cnpq_2025_start_year',
        'profile_aff_postdoc_cnpq_2025_end_year',
        'profile_aff_postdoc_fapemig_start_year',
        'profile_aff_postdoc_fapemig_end_year',
        'profile_aff_postdoc_cnpq_2022_start_year',
        'profile_aff_postdoc_cnpq_2022_end_year',
        'profile_aff_postdoc_embrapa_start_year',
        'profile_aff_postdoc_embrapa_end_year',
        'profile_aff_conecta_start_year',
        'profile_aff_conecta_end_label',
        'profile_postdoc_history_start_year',
        'profile_postdoc_history_end_year',
        'profile_mentor_phd_stat_advisor',
        'profile_mentor_postdoc_fapemig_advisor',
        'profile_mentor_postdoc_cnpq_2022_advisor',
        'profile_mentor_postdoc_embrapa_advisor',
        'profile_mentor_phd_gen_advisor',
        'profile_mentor_phd_gen_coadvisor',
        'profile_mentor_msc_advisor',
        'profile_mentor_msc_coadvisor',
        'profile_mentor_bsc_advisor'
    ]);

    const PLACEHOLDER_SET = new Set(PLACEHOLDER_NAMES);

    function requireObject(value, label) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`${label} must be an object`);
        }
        return value;
    }

    function requireString(value, label) {
        if (typeof value !== 'string' || !value) {
            throw new Error(`${label} must be a non-empty string`);
        }
        return value;
    }

    function requireYear(value, label) {
        if (!Number.isInteger(value)) {
            throw new Error(`${label} must be an integer year`);
        }
        return String(value);
    }

    function findRecord(profile, collection, id) {
        const records = profile[collection];
        if (!Array.isArray(records)) {
            throw new Error(`profile.${collection} must be an array`);
        }
        const matches = records.filter(item => item && item.id === id);
        if (matches.length !== 1) {
            throw new Error(
                `Expected exactly one profile.${collection} record for ${id}; found ${matches.length}`
            );
        }
        return matches[0];
    }

    function organization(profile, id) {
        const organizations = requireObject(profile.organizations, 'profile.organizations');
        return requireObject(organizations[id], `profile.organizations.${id}`);
    }

    function mentorDisplay(mentor, langData) {
        const value = requireObject(mentor, 'mentor');
        const titleKey = value.title_code === 'researcher'
            ? 'edu-mentor-title-researcher'
            : value.title_code === 'professor'
                ? 'edu-mentor-title-professor'
                : null;
        if (!titleKey) {
            throw new Error(`Unsupported mentor title_code: ${value.title_code}`);
        }
        const prefix = requireString(langData[titleKey], titleKey);
        return `${prefix} ${requireString(value.name, 'mentor.name')}`.trim();
    }

    function currentEndLabel(record, langData) {
        if (record.current === true) {
            return requireString(langData['edu-period-present'], 'edu-period-present');
        }
        return requireYear(record.end_year, `${record.id}.end_year`);
    }

    function buildFacts(profileInput, langDataInput) {
        const profile = requireObject(profileInput, 'profile');
        const langData = requireObject(langDataInput, 'translations language');

        const person = requireObject(profile.person, 'profile.person');
        const location = requireObject(person.location, 'profile.person.location');

        const ufv = organization(profile, 'ufv');
        const embrapa = organization(profile, 'embrapa-cassava-fruits');
        const cnpq = organization(profile, 'cnpq');
        const fapemig = organization(profile, 'fapemig');
        const conecta = organization(profile, 'conecta-gem');

        const phdStat = findRecord(profile, 'education', 'phd-applied-statistics-biometrics');
        const phdGen = findRecord(profile, 'education', 'phd-genetics-breeding');
        const msc = findRecord(profile, 'education', 'msc-genetics-breeding');
        const bsc = findRecord(profile, 'education', 'bsc-agronomy');

        const postdocCnpq2025 = findRecord(profile, 'affiliations', 'postdoc-ufv-cnpq-2025');
        const postdocFapemig = findRecord(profile, 'affiliations', 'postdoc-ufv-fapemig-2023-2025');
        const postdocCnpq2022 = findRecord(profile, 'affiliations', 'postdoc-ufv-cnpq-2022-2023');
        const postdocEmbrapa = findRecord(profile, 'affiliations', 'postdoc-embrapa-cnpq-2022');
        const conectaAffiliation = findRecord(profile, 'affiliations', 'conecta-gem-2021-present');

        const postdocs = [
            postdocCnpq2025,
            postdocFapemig,
            postdocCnpq2022,
            postdocEmbrapa
        ];
        const postdocStart = Math.min(...postdocs.map(item => item.start_year));
        const postdocEnd = Math.max(...postdocs.map(item => item.end_year));

        const facts = {
            profile_person_name: requireString(person.name, 'profile.person.name'),
            profile_display_name: requireString(person.display_name, 'profile.person.display_name'),
            profile_email: requireString(person.email, 'profile.person.email'),
            profile_city: requireString(location.city, 'profile.person.location.city'),
            profile_region: requireString(location.region, 'profile.person.location.region'),

            profile_org_ufv_name: requireString(ufv.name, 'organizations.ufv.name'),
            profile_org_ufv_short: requireString(ufv.short_name, 'organizations.ufv.short_name'),
            profile_org_embrapa_name: requireString(embrapa.name, 'organizations.embrapa-cassava-fruits.name'),
            profile_org_embrapa_short: requireString(embrapa.short_name, 'organizations.embrapa-cassava-fruits.short_name'),
            profile_org_cnpq_name: requireString(cnpq.name, 'organizations.cnpq.name'),
            profile_org_cnpq_short: requireString(cnpq.short_name, 'organizations.cnpq.short_name'),
            profile_org_fapemig_name: requireString(fapemig.name, 'organizations.fapemig.name'),
            profile_org_fapemig_short: requireString(fapemig.short_name, 'organizations.fapemig.short_name'),
            profile_org_conecta_name: requireString(conecta.name, 'organizations.conecta-gem.name'),

            profile_edu_phd_stat_start_year: requireYear(phdStat.start_year, 'phd-applied-statistics-biometrics.start_year'),
            profile_edu_phd_stat_end_label: currentEndLabel(phdStat, langData),
            profile_edu_phd_gen_start_year: requireYear(phdGen.start_year, 'phd-genetics-breeding.start_year'),
            profile_edu_phd_gen_end_year: requireYear(phdGen.end_year, 'phd-genetics-breeding.end_year'),
            profile_edu_msc_start_year: requireYear(msc.start_year, 'msc-genetics-breeding.start_year'),
            profile_edu_msc_end_year: requireYear(msc.end_year, 'msc-genetics-breeding.end_year'),
            profile_edu_bsc_start_year: requireYear(bsc.start_year, 'bsc-agronomy.start_year'),
            profile_edu_bsc_end_year: requireYear(bsc.end_year, 'bsc-agronomy.end_year'),

            profile_aff_postdoc_cnpq_2025_start_year: requireYear(postdocCnpq2025.start_year, 'postdoc-ufv-cnpq-2025.start_year'),
            profile_aff_postdoc_cnpq_2025_end_year: requireYear(postdocCnpq2025.end_year, 'postdoc-ufv-cnpq-2025.end_year'),
            profile_aff_postdoc_fapemig_start_year: requireYear(postdocFapemig.start_year, 'postdoc-ufv-fapemig-2023-2025.start_year'),
            profile_aff_postdoc_fapemig_end_year: requireYear(postdocFapemig.end_year, 'postdoc-ufv-fapemig-2023-2025.end_year'),
            profile_aff_postdoc_cnpq_2022_start_year: requireYear(postdocCnpq2022.start_year, 'postdoc-ufv-cnpq-2022-2023.start_year'),
            profile_aff_postdoc_cnpq_2022_end_year: requireYear(postdocCnpq2022.end_year, 'postdoc-ufv-cnpq-2022-2023.end_year'),
            profile_aff_postdoc_embrapa_start_year: requireYear(postdocEmbrapa.start_year, 'postdoc-embrapa-cnpq-2022.start_year'),
            profile_aff_postdoc_embrapa_end_year: requireYear(postdocEmbrapa.end_year, 'postdoc-embrapa-cnpq-2022.end_year'),
            profile_aff_conecta_start_year: requireYear(conectaAffiliation.start_year, 'conecta-gem-2021-present.start_year'),
            profile_aff_conecta_end_label: currentEndLabel(conectaAffiliation, langData),
            profile_postdoc_history_start_year: requireYear(postdocStart, 'postdoc history start_year'),
            profile_postdoc_history_end_year: requireYear(postdocEnd, 'postdoc history end_year'),

            profile_mentor_phd_stat_advisor: mentorDisplay(phdStat.advisor, langData),
            profile_mentor_postdoc_fapemig_advisor: mentorDisplay(postdocFapemig.advisor, langData),
            profile_mentor_postdoc_cnpq_2022_advisor: mentorDisplay(postdocCnpq2022.advisor, langData),
            profile_mentor_postdoc_embrapa_advisor: mentorDisplay(postdocEmbrapa.advisor, langData),
            profile_mentor_phd_gen_advisor: mentorDisplay(phdGen.advisor, langData),
            profile_mentor_phd_gen_coadvisor: mentorDisplay(phdGen.coadvisors[0], langData),
            profile_mentor_msc_advisor: mentorDisplay(msc.advisor, langData),
            profile_mentor_msc_coadvisor: mentorDisplay(msc.coadvisors[0], langData),
            profile_mentor_bsc_advisor: mentorDisplay(bsc.advisor, langData)
        };

        for (const name of PLACEHOLDER_NAMES) {
            if (!(name in facts)) {
                throw new Error(`Missing interpolation fact for ${name}`);
            }
        }
        return facts;
    }

    function interpolateString(value, facts) {
        return value.replace(PROFILE_PLACEHOLDER_RE, (match, name) => {
            if (!PLACEHOLDER_SET.has(name)) {
                throw new Error(`Unknown profile translation placeholder: ${name}`);
            }
            if (!(name in facts)) {
                throw new Error(`Unresolved profile translation placeholder: ${name}`);
            }
            return String(facts[name]);
        });
    }

    function interpolateValue(value, facts) {
        if (typeof value === 'string') {
            return interpolateString(value, facts);
        }
        if (Array.isArray(value)) {
            return value.map(item => interpolateValue(item, facts));
        }
        if (value && typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    interpolateValue(item, facts)
                ])
            );
        }
        return value;
    }

    function interpolateCatalog(catalogInput, profile) {
        const catalog = requireObject(catalogInput, 'translation catalog');
        const output = {};
        for (const [lang, langDataInput] of Object.entries(catalog)) {
            const langData = requireObject(langDataInput, `translations.${lang}`);
            const facts = buildFacts(profile, langData);
            output[lang] = interpolateValue(langData, facts);
        }
        return output;
    }

    return Object.freeze({
        PLACEHOLDER_NAMES,
        buildFacts,
        interpolateCatalog,
        interpolateString
    });
}));
