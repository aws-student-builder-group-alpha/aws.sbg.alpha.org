/** The recruitment portal owns cycle dates, preparation and application access. */
export const COMBINED_PREVIEW = process.env.NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW === '1'
export const RECRUITMENT_URL = COMBINED_PREVIEW ? '/recruitment' : 'https://aws-alpha-recruitment.vercel.app'
