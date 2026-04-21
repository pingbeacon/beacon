export interface User {
  id: number
  name: string
  email: string
  gravatar: string
  email_verified_at: string | null
  [key: string]: unknown
}
