import NextAuth from 'next-auth';
import { authOptions } from './auth-options';

console.log("Customer NextAuth başlatılıyor, provider:", authOptions?.providers?.[0]?.id || "Bulunamadı");

export default NextAuth(authOptions);
export { authOptions }; 