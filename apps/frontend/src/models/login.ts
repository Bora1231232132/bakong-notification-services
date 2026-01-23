export interface IRequestLogin {
  Email: string
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
  Email: string
  Password: string
}
