/**
 * Species functional-trait catalog (slide-18 icons), generated from the
 * CommuniTREE "Species Master" upload sheet (96 species). Keyed by lowercased
 * scientific name AND common name. Live reports read traits from
 * master_plantspecies via the server; this client table makes the fixture
 * PREVIEW faithful (the preview has no DB join). Keep in sync with
 * db/migrations/004_seed_species_vandalur.sql.
 */
export interface SpeciesTraits { timber: boolean; pollination: boolean; nesting: boolean; fruit: boolean; }

export const SPECIES_TRAITS: Record<string, SpeciesTraits> = {
  "phyllanthus emblica": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "indian gooseberry": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "phyllanthus acidus": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "otaheite gooseberry": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "grevillea robusta": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "silky oak": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "murraya koenigii": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "curry tree": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "psidium guajava": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "guava": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "artocarpus heterophyllus": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "jackfruit": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "punica granatum": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "pomegranate": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "swietenia macrophylla": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "mahogany": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "madhuca longifolia": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "moha": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "mangolia": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "southern magnolia": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "pithecellobium dulce": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "manila tamarind": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "lawsonia inermis": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "henna": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "syzygium cumini": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "jamun": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "azadirachta indica": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "neem": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "polyaltha longifolia": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "false ashoka": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "vitex negundo": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "chaste tree": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "pongamia pinnata": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "indian beech": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "senna tora": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "sickle senna": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "albizia lebbeck": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "sirish": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "pterocarpus marsupiium": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "indian kino tree": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "diospyros ebenum": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "ceylon ebony": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "limonia acidissima": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "wood apple": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "tectona gardis": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "teak": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "alstonia scholaris": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "saptaparni": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "annona muricata": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "soursop": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "bauhinia purpurea": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "orchid tree": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "cassia siamea": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "thai copperpod": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "delonix regia": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "flamboyant tree": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "ficus racemosa": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "umar": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "lagerstroemia speciosa": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "jarul": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "mangifera indica": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "mango": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "mimusops elengi": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "bakul": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "neolamarckia cadamba": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "kadamb": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "sterculia foetida": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "jangli badam": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "terminalia arjuna": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "arjun": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "terminalia catappa": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "indian almond": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "thespesia populnea": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "portia tree": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "acacia nilotica": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "karuvelai": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "acacia leucophloea": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "velvaelam": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "aegle marmelos": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "maredu": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "ailanthus excelsa": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "marukh": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "bauhinia racemosa": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "atti": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "bombax ceiba": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "red silk cotton": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "butea monosperma": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "palash": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "cassia fistula": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "amaltas": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "cochlospermum religiosum": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "galgal": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "dalbargia lanceolaria": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "bastard rose wood": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "dalbergia sissoo": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "shisham": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "dillenia indica": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "uvaa / uvaay / uvaa theakku": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "dysoxylum malabaricum": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "vellagil": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "erythrina variegata": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "indian coral tree": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "eucalyptus tereticornis": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "safeda": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "ficus amplissima": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "piparee": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "ficus bengalensis": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "banyan tree": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "ficus hispida": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "kala umber": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "ficus mysorensis": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "alada mara": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "ficus religiosa": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "peepal": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "garcinia indica": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "kokum": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "gmelina arborea": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "ashwatha": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "haldina cordifolia": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "haldu": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "holoptelea integrifolia": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "avil thol": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "lannea cooromandelica": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "anaikarai": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "melia dubia": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "malabar neem": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "mesua ferrea": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "naga kesaralu": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "pogamia pinnata": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "karanj": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "pterocarpus marsupium": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "bijasal": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "pterospermum acerifolium": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "matsakanda": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "saraca indica": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "sita ashok": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "schleichera oleosa": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "kumbadiri": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "tectona grandis": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "sagwan": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "syzigium cumini": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "terminalia bellirica": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "behada": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "acacia ferruginea": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "chimaivelvel": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "bauhinia": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "samanea saman": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "rain tree": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "simarouba glauca": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "soorgam": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "lagerstroemia indica": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "crape myrtle": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "indian tulip": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "euphorbia tirucalli": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "pencil tree": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "dimocarpus longan": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "ilaangan": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "pterocarpus santalinus": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "semmaram": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "dalbergia latifolia": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "indian rosewood": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "millingtonia hortensis": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "indian cork tree": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "bambusoideae": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "moongil": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "salix tetrasperma": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "indian willow": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "ocimum tenuiflorum": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "holy basil": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "saraca asoca": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "ashoka": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "wrightia tinctoria": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "pala indigo": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "annona squamosa": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "sitafal": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "gliricidia": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "duranta erecta": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "golden dewdrop": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "tamarindus indica": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "tamarind": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "prosopis cineraria": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "shami tree": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "couroupita guianensis": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  },
  "nagalingam": {
    "timber": true,
    "nesting": true,
    "pollination": true,
    "fruit": true
  }
};

export function lookupSpeciesTraits(...names: (string | undefined)[]): SpeciesTraits {
  for (const n of names) {
    if (!n) continue;
    const hit = SPECIES_TRAITS[n.trim().toLowerCase()];
    if (hit) return hit;
  }
  return { timber: false, pollination: false, nesting: false, fruit: false };
}
