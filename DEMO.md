# Five-minute judging demo

Prepare a deployed URL, an authenticated owner account, a verified admin account, and a phone. Use your real event-registration destination. Keep one normal browser window and one private window ready. Rehearse on the actual deployment; do not assume a local QR will work on a phone.

## 0:00 — Create the connection

1. Sign in and create **Innovista Registration** under Campaigns.
2. Create a link titled **Event registration**, custom alias **fest26**, assigned to that campaign.
3. Show the real generated URL.
4. Attempt the same alias again. Show the database-enforced conflict response.

If `fest26` already exists, use a fresh alias before beginning the demo. Do not silently delete or reset real analytics.

## 1:00 — Share, scan, measure

1. Copy the URL from link details and open it in the private window.
2. Show the destination reached by the real 302 redirect.
3. Download/display its QR code and scan it on the phone.
4. Return to analytics and click Refresh: visits and the QR source now come from stored requests.

## 2:00 — Prove the rules

1. Open Rule Lab from the link detail page.
2. Show **Normal visit**, **Expired link**, **Click limit reached**, **Password required**, and **Disabled link**.
3. Point to the ordered decision trace.
4. Explain that this uses the same evaluator as production but performs no redirect or write.
5. Create a separate cap-1 link. Open it twice: the second actual request must be denied. This demonstrates live enforcement without altering the main link's historical counter.

## 3:00 — Keep control

1. Disable the main link through its detail screen; open the public URL again and show the unavailable page.
2. Optionally demonstrate password protection on a separate link: opening the challenge does not increase accepted visits.
3. If time allows, sign into the admin account and apply a reasoned takedown. Explain why an owner cannot bypass it by turning their toggle on.

## 4:00 — Show the evidence

1. Open campaign-level analytics and refresh.
2. Show ordinary traffic, probable bots, accepted totals and recent events.
3. Show that disabling preserved all historical analytics.
4. Explain: all accepted responses count toward caps; bot labels are heuristic; blocked/gated attempts are separate; unique visitors are approximate.

Close with: **“Short links you can trust. Rules you can prove.”**

## Honest answers for judges

- “The row lock, counter increment and event insert share one transaction.”
- “An accepted redirect is our server issuing an authorized response, not proof that the destination loaded.”
- “We do not claim malware detection, verified human traffic, or fabricated geography.”
- “No external analytics service receives visitor data. We keep minimal metadata and an anonymous cookie-based estimate.”
