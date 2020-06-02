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
pico-debug localhost:8080
```

When prompted, enter a value URI for a pico running on that engine

Some things to try

```
/api/engine-version
/api/root-eci
/sky/cloud/<ECI>/io.picolabs.visual_params/dname
/sky/cloud/<ECI>/io.picolabs.wrangler/children
/sky/event/<ECI>/<EID>/visual/update?dname=Bob&color=%2300FFFF
```

Where `<ECI>` means put an event channel identifier here, 
and `<EID>` means provide an event identifier here,
and `%23` is the encoding of the `#` symbol
  
  
