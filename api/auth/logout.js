export const config = { runtime: "edge" };

export default function handler() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login.html",
      "Set-Cookie": "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    }
  });
}
