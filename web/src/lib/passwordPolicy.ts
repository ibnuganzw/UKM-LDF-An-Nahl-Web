export const MIN_PASSWORD_LENGTH = 10;

export function passwordPolicyError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Kata sandi harus memuat setidaknya satu huruf dan satu angka.';
  }
  return null;
}

export function passwordAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes('password should contain')
    || normalized.includes('password should be at least')
    || normalized.includes('weak password')
  ) {
    return `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter dan harus memuat setidaknya satu huruf dan satu angka.`;
  }
  return message;
}
