import NextAuth from 'next-auth';
import { authOptions } from './auth-options';

export { authOptions };
export default NextAuth(authOptions); 