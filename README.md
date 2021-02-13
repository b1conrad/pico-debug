# pico-debug
a command line debugger for picos

This is for version 1.x of the pico engine.
The same code works for picos running on earlier versions --
see v0-README.md for relevant information.

## Installation
clone this repo
```
git clone https://github.com/b1conrad/pico-debug.git
cd pico-debug
npm install
npm link
```

## Usage
```
pico-debug http://localhost:3000
```

The first argument must be a URL for a running pico-engine.

## The idea

The idea is that since you have entered the host and port of
a pico engine, you can now just enter the remaining parts
of URLs to be sent, leaving off that first part.
That works just fine here, but we have added even more shortcuts.

When prompted, enter a URI path for a pico hosted on that engine,
and that request will be sent to the engine running at the given host:port
and the response will be displayed in-line, and you will be prompted again.

## Principles of Operation

The root pico will have the `pico-debug` ruleset installed in it.
A child pico will be created for the root pico which will
have the `pico-debug-session` ruleset in it.
These rulesets and the extra child pico will be removed when
`pico-debug` terminates normally.

When the `pico-debug-session` ruleset is installed,
it creates a child pico and installs the `pico-debug-krl` ruleset in it.
As KRL expressions are entered by you, they are passed to this
ruleset which creates a KRL ruleset which is installed
in the root pico and a query sent there produces the result.

## Some queries and events to try

```
/api/ui-context
/sky/cloud/<ECI>/io.picolabs.pico-engine-ui/box
/sky/event/<ECI>/<EID>/engine_ui/box?name=Pico&backgroundColor=%2300FFFF
```

Where `<ECI>` means put an event channel identifier here, 
and `<EID>` means provide an event identifier here,
and `%23` is the encoding of the `#` symbol
 
These commands would show the `ui-context` (which pico-debug has
alread done), show the basic UI information about the root pico,
and change the color of the root pico to cyan.
(You can change it back with a similar command, using
the color from its `box`.)

## Some commands

```
eci ckj5q44eq00017a2rcvxs8evv Back to root
rid
rids
exit
quit
```

The first command, `eci ...` sets a "current" pico by giving its ECI and an optional label so that you can recognize it in the command history. 
The string "ECI" in any query will be replaced by the current ECI value.

The `rid` command will display a list of all of the rulesets installed in the current pico,
allowing you to select one of them as the "current" ruleset.
The string "RID" in any query will be replaced by the current ruleset identifier.

The `rids` command will list the rulesets installed in the current pico.

The `exit` and `quit` commands will exit the `pico-debug` program,
and clean up the added child picos and rulesets.

### Command history

All of the events/queries/commands that you enter are kept in a history list. 
You can use the up and down arrow keys to navigate through this history.

Before pressing Enter or Return to issue the query (or event),
you can use the left and right arrow keys to move through it,
the Delete and Backspace keys to remove characters in it,
and Ctrl-A to move to the beginning of the line
and Ctrl-E to move to the end of the line.
When finished editing, press Enter or Return to submit the query.

### Shortcuts

`query` followed by a space will be replaced by `/sky/cloud/ECI/RID/` 
reducing the amount of typing required to query the current pico and current ruleset.

`event` followed by a space will be replaced by `/sky/event/ECI/EID/`
reducing the amount of typing required to send an event to the current pico.

Examples:

```
query box
event engine_ui/new?name=John&backgroundColor=%23CCCCCC
```

The first example assumes that the current RID is `io.picolabs.wrangler`
and queries for the children of the current pico.

The second example creates a new child pico named "John" with a gray background.

### Directly evaluate a KRL expression

This command allows you to evaluate a KRL expression in the context
of the root pico.

Examples:

```
krl 5+7
krl ["a","b","c"].map(function(x){x.ord()})
```
### Assignment and KRL operators

Query and event results can now be bound to a name,
and then that result can be subjected to KRL operators.

Examplse:

```
b = query box
c = b{"children"}
c.typeof()
c.length()
```

The first example, assuming that the current RID is `io.picolabs.pico-engine-ui`,
queries for the box information of the current pico
(assuming the ECI is for the "engine ui" channel).
This is saved under the local (to pico-debug) name of "b".

The next lines compute (using KRL operators):
the children of the current pico (assigned to local name "c"),
the type of the result ("Array"),
the number of children

### Setting an ECI from a list of children

In the `c.length()` command, if the length I was given was 12
and the last pico that I had created was named "John,"
these commands would position to that pico:

```
j=c[11]
eci@j
```

