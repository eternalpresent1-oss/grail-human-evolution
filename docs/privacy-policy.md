# Privacy Policy — Arche: Architect of the Self

Last updated: 29 October 2026

This policy describes what Arche collects, where it lives, and how you can delete it. It matches the current product behaviour. Publish this page at a public HTTPS URL before the Play Store listing asks for a privacy link.

## Who we are

Arche (“the app”) is a personal practice app for phones. Contact for privacy questions will be listed on the store page when the app is published.

## What the app stores on your phone

By default your progress stays on the device:

- Profile details you enter (name, date of birth, drive line)
- Life survey answers
- Atoms (tasks), campaigns/goals, talent tree, achievements
- Shadow marks and retractions
- Counsel chat thread on the device
- Life-vector reading text
- Local URI of a photo you choose as the Grail card background (the image file itself stays on the phone)
- Notification schedules you set
- Language follows the device (English or Russian)

Local data stays on the device while you use the app and after you sign out. There is no separate Settings control to reset or wipe local data on its own.

## Account and server copy

When you sign in with Apple or Google and a server address is configured:

- The server stores an account tied to the Apple or Google subject (and email only if the provider returns one)
- A session token hash (not the raw token)
- A JSON snapshot of your progress (without the OpenAI key field and without the photo file)
- Subscription status from the store receipt
- Daily counsellor usage counters (questions and vector refreshes)
- A record that account deletion was requested

Photo files are not uploaded. The server never receives `isPremium` from the phone; premium status comes from the store receipt after verification.

## Counsellor and OpenAI

When you ask the Advisor or refresh the life vector while signed in, the phone sends a text snapshot of your progress to our API. The server checks your session, subscription, and daily limits, then may send that snapshot to OpenAI (`gpt-4o-mini`) to generate a reply. Day and shadow vector texts that are produced only on the phone do not call OpenAI.

Limits: 50 advisor questions and 10 shared vector refreshes per local calendar day. Unused slots do not roll over.

OpenAI processes the snapshot only to answer your request. Do not put secrets you do not want processed into the advisor chat.

## Subscriptions

Digital subscriptions are sold only through Google Play and (later) the App Store. We do not take card details inside the app. After a subscription ends, content you already created stays on the phone; creating new paid-tier items locks again until a new active subscription is verified.

## Free taste

Without a subscription you can use canon Done/Burn, take the survey once, place exactly one shadow mark ever, read the canon analysis, use breath practice, and see one life-vector display. Advisor chat is not part of the free taste.

## Deletion

- **Sign out** ends the server session on that phone. Local progress stays on the device.
- **Delete account** removes your server snapshot, sessions, and usage counters, marks subscriptions closed, and stores a deletion record. The same action also clears all local app data on that phone (a full wipe), then the introduction and survey run again. The same Apple or Google account can sign in later as a new empty user.

## Children

Arche is not directed at children under 16. Do not create an account for a child under that age.

## Legal basis (EU / GDPR note)

Date of birth and other profile fields are personal data. Before publishing in the EU we will state the lawful basis and retention period on the published policy page. Until then treat this document as the factual description of processing only.

## Changes

We will update this document when behaviour changes and refresh the “Last updated” date.

## Languages

This English text is the source for the store listing. A Russian translation for users may be published alongside it; if wording differs, the English store version controls for legal listing purposes until a bilingual legal review is done.
