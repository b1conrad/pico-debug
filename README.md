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

When prompted, enter a URI path for a pico hosted on that engine,
and that request will be sent to the engine running at localhost:8080
and the response will be displayed as `stdout`.

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

The first command, `eci ...` sets a "current" pico by giving its ECI and an optional label. The string "ECI" in any query will be replaced by the current ECI value.

The `rid` command will display a list of all of the rulesets installed in the current pico,
allowing you to select one of them as the "current" ruleset.
The string "RID" in any query will be replaced by the current ruleset identifier.

The `rids` command will list the rulesets installed in the current pico.

The `exit` and `quit` commands will exit the `pico-debug` program.

### Command history

All of the queries that you enter are kept in a history list. 
You can use the up and down arrow keys to navigate through this history.

Before pressing Enter or Return to issue the query (or event),
you can use the arrow keys to move through it,
the Delete and Backspace keys to remove characters in it,
and Ctrl-A to move to the beginning of the line
and Ctrl-E to move to the end of the line.
When finished editing, press Enter or Return to submit the query.
