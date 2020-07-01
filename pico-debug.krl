ruleset pico-debug {
  meta {
    shares __testing, rs
  }
  global {
    __testing = { "queries":
      [ { "name": "__testing" },
        { "name": "rs", "args": [ "ops_base64encoded" ] }
      ] , "events":
      [ { "domain": "debug", "type": "session_needed", "attrs": [ "name" ] }
      , { "domain": "debug", "type": "session_expired", "attrs": [ "eci" ] }
      ]
    }
    rs = function(ops){
      rsn = random:uuid();
      e = math:base64decode(ops);
      code = e.match(re#^ #) => e | "ent:obj"+e;
      <<
ruleset #{rsn} {
  meta {
    use module io.picolabs.wrangler alias wrangler
    use module io.picolabs.subscription alias subs
    use module io.picolabs.visual_params alias v_p
    shares result
  }
  global {
    result=function(){
      #{code}
    }
  }
  rule set_obj {
    select when debug new_obj
    fired {
      ent:obj := event:attr("obj")
    }
  }
}>>
    }
    session_url = "https://raw.githubusercontent.com/b1conrad/pico-debug/master/pico-debug-session.krl"
    session_rid = "pico-debug-session"
  }
  rule create_child_pico {
    select when debug session_needed
    pre {
      name = event:attr("name") || random:uuid()
    }
    fired {
      raise wrangler event "new_child_request" attributes {
        "name": name, "rids_from_url": session_url
      }
    }
  }
  rule identify_session {
    select when wrangler new_child_created
      where event:attr("rids_from_url") >< session_url
    pre {
      eci = event:attr("eci")
    }
    send_directive("_txt",{"content":eci.encode()})
  }
  rule do_nothing {
    select when wrangler child_initialized
      where event:attr("rids_from_url") >< session_url
  }
  rule remove_session {
    select when debug session_expired eci re#(.+)# setting(eci)
    fired {
      raise wrangler event "child_deletion"
        attributes {"id":engine:getPicoIDByECI(eci)}
    }
  }
  rule clean_up {
    select when wrangler child_deleted
      where event:attr("rids") >< session_rid
  }
}
