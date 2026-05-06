# Improve Agent Pipeline
## Known Devices:
### Phone:
- Model:
    - [Mitel 480 IP Display Phone (IP480)](https://www.pcliquidations.com/p112449-mitel-480-ip-display?&msclkid=b8da85ad13c7181c1088ec565fc7d159&utm_source=bing&utm_medium=cpc&utm_campaign=OMG%20%7C%20SH%20%7C%20All%20Products%20(CAT)&utm_term=4581183937291926&utm_content=Ad%20group%20%231)
- System:
    - Mitel Connect (ShoreTel) via Director

### Current Contacts Database:
- [Google Sheets](https://docs.google.com/spreadsheets/d/1QOdkmzhisy7T2D38W0t_GPawVWhpSUn2MbdQTdENk6g/edit?gid=1124187493#gid=1124187493)


# Core
## Issues:
- Binder captures a time when contacts were up-to-date. Now requires new printed pages if out-of-date.
    - This is especially an issue if a last name changes.
- Mitel has limitations on its API, and is gated by software upgrades.
    - [Mitel's API Guide](https://developer.mitel.io/guides-resources/api-guides?)

## Ideas:
### Cloud Phone System?
- [Twilio](https://www.twilio.com/en-us/pricing/current-rates?adobe_mc_sdid=SDID%3D59081E518DE16383-0C508BD75F278DA7%7CMCORGID%3D32523BB96217F7B60A495CB6%40AdobeOrg%7CTS%3D1778082506&adobe_mc_ref=https%3A%2F%2Fwww.twilio.com%2Fen-us%2Fcustomer-engagement-platform):
    - Pros:
        - Very Flexible
        - Capabilities:
            - Can run a Python/Node script
            - Script reads Google Sheets
            - Decides how to route
        - Physical phones become optional
    - Cons:
        - Requires some knowledge of coding/scripting
        - Need to switch to SIP-compatible models IF we wanted to keep phones
            - Unfortunately, Mitel IP480 will not work
            - $100 or so PER phone
                - Maybe cheaper models exist

- [RingCentral](https://www.ringcentral.com/office/plansandpricing.html?sl=y&BMID=SEM2508BNG1354765&CID=sem&customer_id=755-481-5690&utm_source=bing&utm_medium=cpc&utm_campaign=Bing_US_Search_Brand_Exact|Brand_Core&utm_term=ringcentral|be&utm_content=23814875196c12309147218e6809461e&BMID=SEM2508BNG1354765&cid=sem&RCKW=ringcentral&RCMT=e&msclkid=23814875196c12309147218e6809461e)
- or [Dialpad](https://www.dialpad.com/pricing/):
    - Pros:
        - Less coding needed
        - Call Routing Rules
        - Mobile and Desktop Apps
    - Cons:
        - Harder to fully drive from Google Sheets
        - Appears to lean heavy into AI
            - AI makes many mistakes, which could drive engagement away.

- Zoom?
    - Pros:
        - Familiar interface
        - Can be used for other b2b transactions
    - Cons:
        - Subscription, if we do not already have

### Dashboard
- Simple Web App
- Lightweight Internal Tool

### Core Desires:
- Remove friction from routing
- Give agents context automatically
- Keep the familiar phone experience
- Connecting Google accounts/calendars or some other PM software that populates from backend.
    - Could make interactions feel more personable:
        - Receptionist knows "James is out of the office until Monday" or that "Yes, Amy is the Jamie Wallce Team" without having to memorize it.
    - Theoretically possible to keep call log on file.
        - Could require learning more about legality.

### Current Flow vs New Flow:
- Current Flow:
    1. Call comes in
    2. Receptionist answers
    3. Check binder for agent
    4. Route call accordingly
    5. Agent answers
    6. Agent asks questions again? (i'm guessing this)
    7. Agent checks calendar? (i'm guessing this)

- New Flow:
    1. Call comes in
    2. Receptionist answers
    3. A screen opens: (NEW)
        - Shows who is on floor
        - Directory for Agents, filterable by Typeahead Search
        - Notes about the caller, if known
    4. Click agent to route to
    5. Agent receives call with notes about caller + their calendar opens

# Implementation:
## Option A (Low-code / fast deployment):
- RingCentral / Dialpad
- Google Sheets
- Simple dashboard

## Option B (more powerful):
- Twilio
- Google Sheets + Calendar
- Custom routing logic

## Next Steps:
- Add a simple dashboard (next step)
- Upgrade phone system (when ready)
- Layer in automation gradually
