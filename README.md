# pico-debug
command line debugger for picos

## Installation
clone this repo
```
git clone git@github.com:b1conrad/pico-debug.git
cd pico-debug
npm install
npm link
```

## Usage
```
pico-debug http://localhost:8080
```

The first argument must be a URL for a running pico-engine.

If the pico-engine uses account management,
you will next be prompted for a user ID and password.
The pico thus selected is called the "owner pico" in what follows.
Otherwise the root pico will be used as the owner pico.

The owner pico will have the `pico-debug` ruleset installed in it.
A child pico will be created for the owner pico which will
have the `pico-debug-session` ruleset in it.
These rulesets and the extra child pico will be removed when
`pico-debug` terminates normally.

When prompted, enter a URI path for a pico hosted on that engine,
and that request will be sent to the engine running at localhost:8080
and the response will be displayed in-line, and you will be prompted again.

### Some queries and events to try

```
/api/engine-version
/api/root-eci
/sky/cloud/<ECI>/io.picolabs.visual_params/dname
/sky/cloud/<ECI>/io.picolabs.wrangler/children
/sky/event/<ECI>/<EID>/visual/update?dname=Bob&color=%2300FFFF
/api/ruleset/flush/<RID>
```

Where `<ECI>` means put an event channel identifier here, 
and `<EID>` means provide an event identifier here,
and `%23` is the encoding of the `#` symbol,
and `<RID>` is a ruleset identifier
  
### Some commands

```
eci NWMucSrdjegvDAdNbnP1dn Root Pico
rid
rids
exit
quit
```

The first command, `eci ...` sets a "current" pico by giving its ECI and an optional label. 
The string "ECI" in any query will be replaced by the current ECI value.

The `rid` command will display a list of all of the rulesets installed in the current pico,
allowing you to select one of them as the "current" ruleset.
The string "RID" in any query will be replaced by the current ruleset identifier.

The `rids` command will list the rulesets installed in the current pico.

The `exit` and `quit` commands will exit the `pico-debug` program.

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
query children
event wrangler/new_child_request?name=John&rids=io.picolabs.aca;io.picolabs.aca.connections
```

The first example assumes that the current RID is `io.picolabs.wrangler`
and queries for the children of the current pico.

The second example creates a new child pico named "John" which is an Aries agent.

### Directly evaluate a KRL expression

This command allows you to evaluate a KRL expression in the context
of the owner pico.

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
c = query children
c.typeof()
c.length()
c.filter(function(x){x{"name"} == "Carol"}).head()
```

The first example, assuming that the current RID is `io.picolabs.wrangler`,
queries for the children of the current pico.

The next lines compute (using KRL operators):
the type of the result ("Array"),
the number of children,
and the child pico named "Carol" (or `null`).
