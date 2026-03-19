export interface CreateOrganizationDto {
  name: string;
  slug: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateOrganizationDto {
  name?: string;
  slug?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}
