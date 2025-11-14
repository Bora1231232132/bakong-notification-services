export interface IRequestLogin {
  Username: string
  Password: string
}

export interface ILoginResponse {
  token: string
  user: {
    id: string
    email: string
    username: string
    role: string
  }
}

export interface ILoginFormData {
  Username: string
  Password: string
}
