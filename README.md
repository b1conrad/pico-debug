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

Some things to try

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
  
  
