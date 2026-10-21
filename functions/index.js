/**
 * Server-side Paystack escrow flow.
 *
 * Secret setup (never commit keys):
 *   firebase functions:secrets:set PAYSTACK_SECRET_KEY
 *
 * Flow:
 *  1. Client calls initializePayment({ jobId }) -> returns Paystack authorization_url.
 *     Amount is read from the job document on the server, never from the client.
 *  2. Customer pays on Paystack's hosted page.
 *  3. Paystack calls paystackWebhook (HMAC-SHA512 verified) -> transaction becomes
 *     'escrow_held' and the job is marked paid.
 *  4. Job owner calls releaseEscrow({ jobId }) after completion -> 'released'.
 *     (Provider payout via Paystack Transfers should be added here.)
 */
const crypto = require("crypto");
const admin = require("firebase-admin");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();
const db = admin.firestore();
const PAYSTACK_SECRET_KEY = defineSecret("PAYSTACK_SECRET_KEY");
const JOB_COLLECTIONS = ["job_requests", "requests"];

async function loadJob(jobId) {
  for (const col of JOB_COLLECTIONS) {
    const snap = await db.collection(col).doc(jobId).get();
    if (snap.exists) return { col, ref: snap.ref, data: snap.data() };
  }
  throw new HttpsError("not-found", "Job not found");
}

function ownerOf(job) {
  return job.clientId || job.userId;
}

async function updateAllJobDocs(jobId, updates) {
  for (const col of JOB_COLLECTIONS) {
    const ref = db.collection(col).doc(jobId);
    if ((await ref.get()).exists) await ref.update(updates);
  }
}

exports.initializePayment = onCall({ secrets: [PAYSTACK_SECRET_KEY] }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  const jobId = String(req.data?.jobId || "");
  if (!jobId) throw new HttpsError("invalid-argument", "jobId required");

  const job = await loadJob(jobId);
  if (ownerOf(job.data) !== req.auth.uid) throw new HttpsError("permission-denied", "Not your job");
  if (job.data.paymentStatus === "escrow_held" || job.data.paymentStatus === "released") {
    throw new HttpsError("failed-precondition", "Job already paid");
  }

  const amountNaira = Number(job.data.budget ?? job.data.price);
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    throw new HttpsError("failed-precondition", "Job has no valid price");
  }

  const reference = `WH_${jobId.slice(0, 8)}_${Date.now()}_${crypto.randomInt(1000, 9999)}`;
  const email = req.auth.token.email;
  if (!email) throw new HttpsError("failed-precondition", "Account has no email");

  const resp = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY.value()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: Math.round(amountNaira * 100), // kobo
      currency: "NGN",
      reference,
      metadata: { jobId, userId: req.auth.uid },
    }),
  });
  const body = await resp.json();
  if (!resp.ok || !body.status) throw new HttpsError("internal", "Payment provider error");

  await db.collection("transactions").doc(reference).set({
    userId: req.auth.uid,
    jobId,
    reference,
    amount: amountNaira,
    currency: "NGN",
    status: "pending",
    type: "escrow_deposit",
    paymentGateway: "paystack",
    title: job.data.serviceType || "Service Escrow Payment",
    createdAt: new Date().toISOString(),
  });

  return { authorizationUrl: body.data.authorization_url, reference };
});

exports.paystackWebhook = onRequest({ secrets: [PAYSTACK_SECRET_KEY] }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const expected = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY.value())
    .update(req.rawBody)
    .digest("hex");
  const given = String(req.headers["x-paystack-signature"] || "");
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;
  if (event?.event !== "charge.success") return res.status(200).send("ignored");

  const reference = event.data?.reference;
  const txRef = db.collection("transactions").doc(String(reference));
  const tx = await txRef.get();
  if (!tx.exists) return res.status(200).send("unknown reference");
  const txData = tx.data();
  if (txData.status !== "pending") return res.status(200).send("already processed");

  // Server-side amount check (kobo) and double confirmation with Paystack
  const verify = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY.value()}` },
  }).then((r) => r.json());
  const paidKobo = verify?.data?.amount;
  if (verify?.data?.status !== "success" || paidKobo !== Math.round(txData.amount * 100)) {
    await txRef.update({ status: "failed", failureReason: "amount_or_status_mismatch" });
    return res.status(200).send("mismatch");
  }

  const now = new Date().toISOString();
  await txRef.update({ status: "escrow_held", paidAt: now });
  await updateAllJobDocs(txData.jobId, {
    paymentStatus: "escrow_held",
    escrowReference: reference,
    escrowAmount: txData.amount,
    escrowTransactionId: reference,
    escrowSecuredAt: now,
  });
  await db.collection("notifications").add({
    userId: txData.userId,
    recipientId: txData.userId,
    title: "Escrow Payment Secured 🔒",
    body: `₦${txData.amount} is held safely in escrow. Reference: ${reference}`,
    type: "escrow",
    isRead: false,
    createdAt: now,
    payload: { jobId: txData.jobId, reference },
  });
  return res.status(200).send("ok");
});

exports.releaseEscrow = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  const jobId = String(req.data?.jobId || "");
  if (!jobId) throw new HttpsError("invalid-argument", "jobId required");

  const job = await loadJob(jobId);
  const isAdmin = req.auth.token.admin === true;
  if (!isAdmin && ownerOf(job.data) !== req.auth.uid) {
    throw new HttpsError("permission-denied", "Only the client can release escrow");
  }
  if (job.data.paymentStatus !== "escrow_held" || !job.data.escrowTransactionId) {
    throw new HttpsError("failed-precondition", "No escrow held for this job");
  }

  const now = new Date().toISOString();
  await db.collection("transactions").doc(job.data.escrowTransactionId).update({
    status: "released",
    releasedAt: now,
  });
  await updateAllJobDocs(jobId, {
    paymentStatus: "released",
    paymentReleasedAt: now,
    status: "completed",
  });
  // TODO: trigger Paystack Transfer to the provider's recipient code here.
  return { success: true };
});
