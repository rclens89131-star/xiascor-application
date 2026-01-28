import bcrypt from "bcryptjs";

async function main() {
  const email = process.env.SORARE_EMAIL || "";
  const password = process.env.SORARE_PASSWORD || "";
  const aud = process.env.SORARE_AUD || "companion-sorare";

  if (!email || !password) {
    console.error("Missing SORARE_EMAIL or SORARE_PASSWORD");
    process.exit(2);
  }

  // 1) get salt
  const saltResp = await fetch(`https://api.sorare.com/api/v1/users/${encodeURIComponent(email)}`);
  if (!saltResp.ok) {
    const t = await saltResp.text();
    throw new Error(`salt request failed ${saltResp.status}: ${t}`);
  }
  const saltJson = await saltResp.json();
  const salt = saltJson.salt;
  if (!salt) throw new Error("No salt in response");

  // 2) hash password with bcrypt+salt
  const hashed = bcrypt.hashSync(password, salt);

  // 3) signIn mutation -> jwtToken
  const query = `
    mutation SignInMutation($input: signInInput!) {
      signIn(input: $input) {
        currentUser { slug }
        jwtToken(aud: "${aud}") { token expiredAt }
        errors { message }
      }
    }
  `.trim();

  const body = JSON.stringify({
    operationName: "SignInMutation",
    variables: { input: { email, password: hashed } },
    query
  });

  const r = await fetch("https://api.sorare.com/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body
  });

  const raw = await r.text();
  if (!r.ok) throw new Error(`signIn HTTP ${r.status}: ${raw}`);

  const data = JSON.parse(raw);
  const errs = data?.data?.signIn?.errors || [];
  if (errs.length) throw new Error("signIn errors: " + errs.map(e=>e.message).join(" | "));

  const jwt = data?.data?.signIn?.jwtToken?.token;
  const exp = data?.data?.signIn?.jwtToken?.expiredAt;

  if (!jwt) throw new Error("No jwtToken.token returned (2FA maybe enabled?)");

  console.log(JSON.stringify({ jwt, expiredAt: exp }, null, 2));
}

main().catch(e => {
  console.error(String(e?.message || e));
  process.exit(1);
});
