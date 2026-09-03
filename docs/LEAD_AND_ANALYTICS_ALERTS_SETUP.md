# Lead alerts and daily visitor reports

The application is now prepared to send all public leads immediately to the
owner and a consent-based GA4 visitor digest once per day. Private credentials
are deliberately not stored in this repository; an owner must add them in
Supabase and Google Cloud.

## 1. Configure immediate lead alerts

These alerts cover Contact, Schedule Call, Project Estimate, Human Review and
Job Application forms. Buddy voice leads already use the same settings.

In Supabase Dashboard → Project Settings → Edge Function Secrets, set:

```bash
LEAD_ADMIN_EMAIL="scssofwares@gmail.com"
RESEND_API_KEY="re_..."
EMAIL_FROM_ADDRESS="SCS Softwares <hello@scssoftwares.com>"
```

`EMAIL_FROM_ADDRESS` must be a domain identity verified in Resend. Gmail is the
recipient, not the sender; do not put a Gmail password or SMTP credential in
Supabase.

Deploy the public lead function:

```bash
supabase functions deploy submit-lead --no-verify-jwt
supabase functions deploy voice-lead --no-verify-jwt
```

Submit one test contact form and one project estimate. Each stored submission
should produce a `[SCS lead]` email at `scssofwares@gmail.com`.

## 2. Configure the daily visitor report

The site asks visitors before it loads Google Analytics. The report only uses
GA4 aggregate data: active users, sessions, new users, events, and the top 20
country/city/device combinations. It does not request IP addresses, exact
location, client IDs, form content or device fingerprints.

1. In Google Cloud, enable **Google Analytics Data API**.
2. Create a service account and JSON key. In GA4 → Admin → Property Access
   Management, add that service account email as **Viewer** to the SCS GA4
   property.
3. Find the numeric GA4 Property ID (not the `G-...` Measurement ID).
4. Generate a strong random value for `DAILY_REPORT_SECRET`.
5. Add these Supabase Edge Function secrets:

```bash
GA4_PROPERTY_ID="123456789"
GA4_SERVICE_ACCOUNT_EMAIL="reporter@your-google-cloud-project.iam.gserviceaccount.com"
GA4_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
DAILY_REPORT_SECRET="a-long-random-secret"
```

6. Deploy the function:

```bash
supabase functions deploy daily-analytics-report --no-verify-jwt
```

7. Test it once from a secure terminal. Do not paste the secret into a browser
   URL, source code or a public scheduler configuration:

```bash
curl --request POST \
  --header "Authorization: Bearer $DAILY_REPORT_SECRET" \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-analytics-report"
```

8. Create a daily scheduled POST request in your trusted scheduler (for
   example, GitHub Actions with encrypted secrets, Cloud Scheduler, or an
   operations scheduler). Use the same endpoint and Authorization header.
   Set the time after midnight in the GA4 property's timezone so “yesterday”
   is complete.

## Notes

- Daily reports have no data until visitors accept analytics and GA4 begins
  receiving events.
- Analytics consent can be changed from the **Privacy settings** button at the
  bottom-left of the site.
- Email delivery is intentionally best effort: a lead is stored even if Resend
  is temporarily unavailable. Check Supabase function logs if an alert does
  not arrive.
