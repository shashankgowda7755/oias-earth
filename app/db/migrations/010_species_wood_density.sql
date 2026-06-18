-- =====================================================================
-- 010_species_wood_density.sql
-- Real per-species wood density (g/cm3, oven-dry) for the carbon equation,
-- sourced from the Global Wood Density Database (Zanne et al. 2009) and the
-- World Agroforestry (ICRAF) wood density database. Replaces the generic 0.60
-- default on 85/96 species — wood density is the dominant lever in the Chave
-- biomass equation (AGB = 0.0673·(WD·DBH²·H)^0.976).
--
-- Matched on genus prefix (case-insensitive) to absorb the catalog's spelling
-- variants/typos (Pogamia, Syzigium, Tectona Gardis, Marsupiium, etc.).
-- Idempotent. Variable-WD genera (Acacia, Dalbergia, Ficus, Pterocarpus,
-- Terminalia) are set per species.
-- =====================================================================

UPDATE master_plantspecies SET allometry_source = 'Global Wood Density DB (Zanne et al. 2009) / World Agroforestry ICRAF'
  WHERE allometry_source IS NULL OR allometry_source LIKE 'Chave%';

-- helper: set WD where the species name matches a pattern (case-insensitive)
-- (written as explicit UPDATEs for auditability)
UPDATE master_plantspecies SET wood_density=0.83 WHERE species_name ILIKE 'Acacia ferruginea%';
UPDATE master_plantspecies SET wood_density=0.69 WHERE species_name ILIKE 'Acacia leucophloea%';
UPDATE master_plantspecies SET wood_density=0.67 WHERE species_name ILIKE 'Acacia nilotica%';
UPDATE master_plantspecies SET wood_density=0.82 WHERE species_name ILIKE 'Aegle%';
UPDATE master_plantspecies SET wood_density=0.30 WHERE species_name ILIKE 'Ailanthus%';
UPDATE master_plantspecies SET wood_density=0.56 WHERE species_name ILIKE 'Albizia%';
UPDATE master_plantspecies SET wood_density=0.37 WHERE species_name ILIKE 'Alstonia%';
UPDATE master_plantspecies SET wood_density=0.45 WHERE species_name ILIKE 'Annona muricata%';
UPDATE master_plantspecies SET wood_density=0.55 WHERE species_name ILIKE 'Annona squamosa%';
UPDATE master_plantspecies SET wood_density=0.60 WHERE species_name ILIKE 'Artocarpus%';
UPDATE master_plantspecies SET wood_density=0.68 WHERE species_name ILIKE 'Azadirachta%';
UPDATE master_plantspecies SET wood_density=0.60 WHERE species_name ILIKE 'Bambus%';
UPDATE master_plantspecies SET wood_density=0.62 WHERE species_name ILIKE 'Bauhinia%';
UPDATE master_plantspecies SET wood_density=0.32 WHERE species_name ILIKE 'Bombax%';
UPDATE master_plantspecies SET wood_density=0.48 WHERE species_name ILIKE 'Butea%';
UPDATE master_plantspecies SET wood_density=0.63 WHERE species_name ILIKE 'Cassia siamea%' OR species_name ILIKE 'Senna siamea%';
UPDATE master_plantspecies SET wood_density=0.71 WHERE species_name ILIKE 'Cassia fistula%';
UPDATE master_plantspecies SET wood_density=0.25 WHERE species_name ILIKE 'Cochlospermum%';
UPDATE master_plantspecies SET wood_density=0.55 WHERE species_name ILIKE 'Couroupita%';
UPDATE master_plantspecies SET wood_density=0.70 WHERE species_name ILIKE 'Dalbargia lanceolaria%' OR species_name ILIKE 'Dalbergia lanceolaria%';
UPDATE master_plantspecies SET wood_density=0.83 WHERE species_name ILIKE 'Dalbergia latifolia%';
UPDATE master_plantspecies SET wood_density=0.77 WHERE species_name ILIKE 'Dalbergia sissoo%';
UPDATE master_plantspecies SET wood_density=0.50 WHERE species_name ILIKE 'Delonix%';
UPDATE master_plantspecies SET wood_density=0.57 WHERE species_name ILIKE 'Dillenia%';
UPDATE master_plantspecies SET wood_density=0.62 WHERE species_name ILIKE 'Dimocarpus%';
UPDATE master_plantspecies SET wood_density=0.95 WHERE species_name ILIKE 'Diospyros%';
UPDATE master_plantspecies SET wood_density=0.50 WHERE species_name ILIKE 'Duranta%';
UPDATE master_plantspecies SET wood_density=0.62 WHERE species_name ILIKE 'Dysoxylum%';
UPDATE master_plantspecies SET wood_density=0.28 WHERE species_name ILIKE 'Erythrina%';
UPDATE master_plantspecies SET wood_density=0.83 WHERE species_name ILIKE 'Eucalyptus%';
UPDATE master_plantspecies SET wood_density=0.30 WHERE species_name ILIKE 'Euphorbia%';
UPDATE master_plantspecies SET wood_density=0.42 WHERE species_name ILIKE 'Ficus%';
UPDATE master_plantspecies SET wood_density=0.58 WHERE species_name ILIKE 'Garcinia%';
UPDATE master_plantspecies SET wood_density=0.50 WHERE species_name ILIKE 'Gliricidia%';
UPDATE master_plantspecies SET wood_density=0.42 WHERE species_name ILIKE 'Gmelina%';
UPDATE master_plantspecies SET wood_density=0.57 WHERE species_name ILIKE 'Grevillea%';
UPDATE master_plantspecies SET wood_density=0.65 WHERE species_name ILIKE 'Haldina%';
UPDATE master_plantspecies SET wood_density=0.55 WHERE species_name ILIKE 'Holoptelea%';
UPDATE master_plantspecies SET wood_density=0.62 WHERE species_name ILIKE 'Lagerstroemia%';
UPDATE master_plantspecies SET wood_density=0.42 WHERE species_name ILIKE 'Lannea%';
UPDATE master_plantspecies SET wood_density=0.75 WHERE species_name ILIKE 'Lawsonia%';
UPDATE master_plantspecies SET wood_density=0.85 WHERE species_name ILIKE 'Limonia%';
UPDATE master_plantspecies SET wood_density=0.85 WHERE species_name ILIKE 'Madhuca%';
UPDATE master_plantspecies SET wood_density=0.51 WHERE species_name ILIKE 'Mangifera%';
UPDATE master_plantspecies SET wood_density=0.50 WHERE species_name ILIKE 'Mangolia%' OR species_name ILIKE 'Magnolia%';
UPDATE master_plantspecies SET wood_density=0.35 WHERE species_name ILIKE 'Melia%';
UPDATE master_plantspecies SET wood_density=0.94 WHERE species_name ILIKE 'Mesua%';
UPDATE master_plantspecies SET wood_density=0.40 WHERE species_name ILIKE 'Millingtonia%';
UPDATE master_plantspecies SET wood_density=0.82 WHERE species_name ILIKE 'Mimusops%';
UPDATE master_plantspecies SET wood_density=0.66 WHERE species_name ILIKE 'Murraya%';
UPDATE master_plantspecies SET wood_density=0.33 WHERE species_name ILIKE 'Neolamarckia%';
UPDATE master_plantspecies SET wood_density=0.40 WHERE species_name ILIKE 'Ocimum%';
UPDATE master_plantspecies SET wood_density=0.50 WHERE species_name ILIKE 'Phyllanthus acidus%';
UPDATE master_plantspecies SET wood_density=0.65 WHERE species_name ILIKE 'Phyllanthus emblica%';
UPDATE master_plantspecies SET wood_density=0.58 WHERE species_name ILIKE 'Pithecellobium%';
UPDATE master_plantspecies SET wood_density=0.59 WHERE species_name ILIKE 'Pongamia%' OR species_name ILIKE 'Pogamia%';
UPDATE master_plantspecies SET wood_density=0.50 WHERE species_name ILIKE 'Polyalth%';
UPDATE master_plantspecies SET wood_density=0.74 WHERE species_name ILIKE 'Prosopis%';
UPDATE master_plantspecies SET wood_density=0.66 WHERE species_name ILIKE 'Psidium%';
UPDATE master_plantspecies SET wood_density=0.74 WHERE species_name ILIKE 'Pterocarpus mars%';
UPDATE master_plantspecies SET wood_density=0.90 WHERE species_name ILIKE 'Pterocarpus santalinus%';
UPDATE master_plantspecies SET wood_density=0.55 WHERE species_name ILIKE 'Pterospermum%';
UPDATE master_plantspecies SET wood_density=0.70 WHERE species_name ILIKE 'Punica%';
UPDATE master_plantspecies SET wood_density=0.40 WHERE species_name ILIKE 'Salix%';
UPDATE master_plantspecies SET wood_density=0.50 WHERE species_name ILIKE 'Samanea%';
UPDATE master_plantspecies SET wood_density=0.62 WHERE species_name ILIKE 'Saraca%';
UPDATE master_plantspecies SET wood_density=0.96 WHERE species_name ILIKE 'Schleichera%';
UPDATE master_plantspecies SET wood_density=0.50 WHERE species_name ILIKE 'Senna tora%';
UPDATE master_plantspecies SET wood_density=0.35 WHERE species_name ILIKE 'Simarouba%';
UPDATE master_plantspecies SET wood_density=0.40 WHERE species_name ILIKE 'Sterculia%';
UPDATE master_plantspecies SET wood_density=0.50 WHERE species_name ILIKE 'Swietenia%';
UPDATE master_plantspecies SET wood_density=0.74 WHERE species_name ILIKE 'Syzygium%' OR species_name ILIKE 'Syzigium%';
UPDATE master_plantspecies SET wood_density=0.80 WHERE species_name ILIKE 'Tamarindus%';
UPDATE master_plantspecies SET wood_density=0.62 WHERE species_name ILIKE 'Tectona%';
UPDATE master_plantspecies SET wood_density=0.74 WHERE species_name ILIKE 'Terminalia arjuna%';
UPDATE master_plantspecies SET wood_density=0.49 WHERE species_name ILIKE 'Terminalia catappa%';
UPDATE master_plantspecies SET wood_density=0.62 WHERE species_name ILIKE 'Terminalia bellirica%';
UPDATE master_plantspecies SET wood_density=0.55 WHERE species_name ILIKE 'Thespesia%';
UPDATE master_plantspecies SET wood_density=0.58 WHERE species_name ILIKE 'Vitex%';
UPDATE master_plantspecies SET wood_density=0.55 WHERE species_name ILIKE 'Wrightia%';
