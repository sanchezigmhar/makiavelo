import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email invalido' })
  email: string;

  @IsString()
  @MinLength(4, { message: 'La contrasena debe tener al menos 4 caracteres' })
  password: string;
}
