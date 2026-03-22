export interface CreateUserDto {
  email: string;
  password: string;
  role?: string;
  shopId?: string | null;
}
