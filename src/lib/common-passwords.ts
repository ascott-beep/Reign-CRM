/**
 * Round 4 screen 45 (R4AuthNewPw) "Not a common password" rule. A short
 * blocklist of the passwords that turn up at the top of every public
 * breach-corpus frequency list -- enough to catch the obvious cases without
 * pulling in a large external wordlist dependency.
 */
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "letmein123",
  "welcome123",
  "admin1234",
  "iloveyou1",
  "sunshine1",
  "princess1",
  "football1",
  "baseball1",
  "dragon123",
  "monkey123",
  "trustno1",
  "superman1",
  "123123123",
  "abc123456",
  "changeme123",
  "p@ssword1",
  "passw0rd1",
]);

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}
