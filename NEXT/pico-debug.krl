ruleset pico-debug {
  meta {
    use module io.picolabs.wrangler alias wrangler
    shares __testing, session_eci
  }
  global {
    __testing = { "queries":
      [ { "name": "__testing" }
      , { "name": "debug_channel" }
      ] , "events":
      [ { "domain": "debug", "type": "session_needed", "attrs": [ "name" ] }
      , { "domain": "debug", "type": "session_expired", "attrs": [ "eci" ] }
      ]
    }
    session_eci = function(){
      ent:session_eci
    }
    session_rid = "pico-debug-session"
    tags = ["pico-debug"]
    eventPolicy = {"allow":
      [ {"domain":"debug","name":"*"}
      , {"domain":"wrangler","name":"*"}
      ],"deny":[]}
    queryPolicy = {"allow":
      [ {"rid":meta:rid,"name":"*"}
      , {"rid":"io.picolabs.wrangler","name":"*"}
      ],"deny":[]}
    debug_channel = function(){
      ent:debug_channel
    }
  }
  rule initialize {
    select when wrangler ruleset_installed
      where event:attr("rids") >< meta:rid
    if ent:debug_channel.isnull() then
      wrangler:createChannel(tags,eventPolicy,queryPolicy) setting(channel)
    fired {
      ent:debug_channel := channel
    }
  }
  rule create_child_pico {
    select when debug session_needed
    pre {
      name = random:uuid()
    }
    fired {
      ent:name := name;
      raise wrangler event "new_child_request" attributes {
        "name": name
      }
    }
  }
  rule identify_session {
    select when wrangler new_child_created
      where event:attr("name") == ent:name
    pre {
      eci = event:attr("eci")
    }
    event:send({"eci":eci,
      "domain":"wrangler", "type":"install_ruleset_request",
      "attrs":{
        "absoluteURL":meta:rulesetURI,
        "rid":session_rid,
        "pico_debug_channel":ent:debug_channel,
      }
    })
    fired {
      ent:sessions := ent:sessions.defaultsTo([]).append(eci)
      ent:session_eci := eci
    }
  }
  rule do_nothing {
    select when wrangler child_initialized
      where event:attr("name") == ent:name
    fired {
      ent:name := null
    }
  }
  rule remove_session {
    select when debug session_expired eci re#(.+)# setting(eci)
    pre {
      remove_eci = function(x){x!=eci}
      remaining_sessions = ent:sessions.filter(remove_eci)
    }
    fired {
      ent:sessions := remaining_sessions;
      raise wrangler event "child_deletion_request"
        attributes {"eci":eci}
    }
  }
}
