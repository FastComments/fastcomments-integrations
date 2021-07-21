# Core Integration Test Harness

Each integration test must cover the following steps:

1. Creating a token.
2. Verifying the token and fetching the user's tenant id, and saving it.
3. Syncing any local comments to remote.
4. Periodically poll /events to sync remote to local.

Ideally, each test gets its own tenant so that we start with a clean slate. Also, ideally, we follow the steps
the actual user takes when running our tests (visiting the verification page, for example).

In order to not require each integration to use something like Puppeteer, we wrap each core library in a test harness that
calls into the framework to only test the above steps.
