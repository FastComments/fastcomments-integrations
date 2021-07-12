# FastComments Integrations Core

FastComments provides a set of conventions, patterns, and libraries for building integrations.

These libraries are *not* a replacement for the FastComments API. If you just want to use the API, see here: [https://docs.fastcomments.com/guide-api.html](https://docs.fastcomments.com/guide-api.html).

Rather, these core libraries are for building third party plugins that interact with FastComments.

### Using The Library

For example, if you are building a Drupal or WordPress plugin, you should **statically link** the `php` folder
into your project.

## Integration Protocol

The protocol uses a `polling` mechanism as opposed to having FastComments `push` the events to the client.

This is to reduce friction on setup, as this way firewalls and DDOS prevention tools are much less of a concern. The first
version of this framework was `push-based` to lesson the load on our servers, but it created a lot of signup friction
as it would mean that we have to be able to reach your backend.

This way, you only have to be able to reach us!

### Considerations - Use Cases

Your integration needs to be able to handle:

1. Initial setup.
2. Fetch the command stream.
3. Upstream sync.
4. Poll the event log.

### Integration Flow - Initial Setup

For the initial setup your integration be able to send the following HTTPs request: `PUT https://fastcomments.com/integrations/v1/token/<token uuid>`.

It is expected to do this repeatedly until the user acknowledges the integration (and thus your token will be accepted, and this API will return a success response).

Once the token has been validated, the integration should periodically poll the `integration stream` via:

`GET https://fastcomments.com/integrations/v1/stream?token=<token uuid>&lastFetchDate=<epoch timestamp milliseconds>`

This will return you a JSON object with two lists: `commands` and `events`.

For most integrations, you should poll this API continuously (every few seconds) until you receive the SetSetupCompleted event.

After that, once a day is sufficient.

If you have any events, you should process them. An event may be a new or deleted comment, or maybe a vote applied to a comment.

For commands, see the next section.

### Protocol - Commands

The command stream specifies commands to the client. Supported commands:

- `SetSetupCompleted` - Set the setup completed (For example, don't show the setup progress screen anymore). The server will send this when the token is validated and the initial sync is done.
- `SendNextCommentsPayload` - Send the next batch of comments. This is mostly used for initial migrations, but could also be used to re-sync.

### Protocol - Upstream Sync

When the client receives a `SendNextCommentsPayload` command, it should look at the details of this command to determine
what the next set of comments are to sync. This command should define `start` and `count` parameters so the client can paginate
the next set of results and send them to `POST https://fastcomments.com/integrations/v1/comments`. 

### Protocol - Event Log

The event log response will return the following events:

- `new-comment`
- `updated-comment`
- `deleted-comment`
- `new-vote`
- `deleted-vote`

### Testing

All core integration libraries must have integration tests to be merged to master. These tests should consume
the library just like a plugin would, and do steps 1 - 4 as outlined above.
