# FastComments Integrations Core

FastComments provides a set of conventions, patterns, and libraries for building integrations.

### Using The Library

For example, if you are building a Drupal or WordPress plugin, you should **statically link** the `php` folder
into your project.

## Integration Protocol

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

If you have any events, you should process them. An event may be a new or deleted comment, or maybe a vote applied to a comment.

For commands, see the next section.

### Integrations - Commands

The command stream specifies commands to the client. Supported commands:

- `SetSetupCompleted` - Set the setup completed (For example, don't show the setup progress screen anymore).
- `SendNextCommentsPayload` - Send the next batch of comments. This is mostly used for initial migrations, but could also be used to re-sync.

### Integrations - Upstream Sync

When the client receives a `SendNextCommentsPayload` command, it should look at the details of this command to determine
what the next set of comments are to sync. This command should define `start` and `count` parameters so the client can paginate
the next set of results and send them to `POST https://fastcomments.com/integrations/v1/comments`. 

### Integrations - Event Log
