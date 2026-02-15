import { PrismaClient } from "../generated/mysql/client";
import { v4 as uuidv4 } from 'uuid';

/**
 * All 28 districts of Malawi organized by region
 */
const MALAWI_DISTRICTS = [
    // Northern Region (6 districts)
    { name: 'Chitipa', region: 'Northern', code: 'CTP' },
    { name: 'Karonga', region: 'Northern', code: 'KAR' },
    { name: 'Likoma', region: 'Northern', code: 'LIK' },
    { name: 'Mzimba', region: 'Northern', code: 'MZI' },
    { name: 'Nkhata Bay', region: 'Northern', code: 'NKB' },
    { name: 'Rumphi', region: 'Northern', code: 'RUM' },

    // Central Region (9 districts)
    { name: 'Dedza', region: 'Central', code: 'DED' },
    { name: 'Dowa', region: 'Central', code: 'DOW' },
    { name: 'Kasungu', region: 'Central', code: 'KAS' },
    { name: 'Lilongwe', region: 'Central', code: 'LIL' },
    { name: 'Mchinji', region: 'Central', code: 'MCH' },
    { name: 'Nkhotakota', region: 'Central', code: 'NKH' },
    { name: 'Ntcheu', region: 'Central', code: 'NTE' },
    { name: 'Ntchisi', region: 'Central', code: 'NTS' },
    { name: 'Salima', region: 'Central', code: 'SAL' },

    // Southern Region (13 districts)
    { name: 'Balaka', region: 'Southern', code: 'BAL' },
    { name: 'Blantyre', region: 'Southern', code: 'BLA' },
    { name: 'Chikwawa', region: 'Southern', code: 'CKW' },
    { name: 'Chiradzulu', region: 'Southern', code: 'CHI' },
    { name: 'Machinga', region: 'Southern', code: 'MAC' },
    { name: 'Mangochi', region: 'Southern', code: 'MAN' },
    { name: 'Mulanje', region: 'Southern', code: 'MUL' },
    { name: 'Mwanza', region: 'Southern', code: 'MWA' },
    { name: 'Neno', region: 'Southern', code: 'NEN' },
    { name: 'Nsanje', region: 'Southern', code: 'NSA' },
    { name: 'Phalombe', region: 'Southern', code: 'PHA' },
    { name: 'Thyolo', region: 'Southern', code: 'THY' },
    { name: 'Zomba', region: 'Southern', code: 'ZOM' },
];

export async function seedDistricts(prisma: PrismaClient) {
    console.log('📝 Seeding Malawi districts...');

    for (const district of MALAWI_DISTRICTS) {
        await prisma.district.upsert({
            where: { code: district.code },
            update: {
                name: district.name,
                region: district.region,
                isActive: true,
            },
            create: {
                districtId: uuidv4(),
                name: district.name,
                region: district.region,
                code: district.code,
                isActive: true,
            },
        });
    }

    console.log(`✓ ${MALAWI_DISTRICTS.length} Malawi districts seeded`);
}

/**
 * Get district data for use in migrations
 */
export function getMalawiDistrictsData() {
    return MALAWI_DISTRICTS.map(d => ({
        ...d,
        districtId: uuidv4(),
        isActive: true,
    }));
}
