/** The recruitment portal owns cycle dates, preparation and application access. */
export const COMBINED_PREVIEW = process.env.NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW === '1'
export const COMBINED_SITE = COMBINED_PREVIEW || process.env.NEXT_PUBLIC_ALPHA_COMBINED_SITE === '1'
export const RECRUITMENT_URL = COMBINED_SITE ? '/recruitment' : 'https://aws-recruitment.vercel.app'
