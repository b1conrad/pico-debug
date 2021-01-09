ruleset pico-debug-session {
  meta {
    use module io.picolabs.wrangler alias wrangler
    shares __testing, bindings
  }
  global {
    __testing = { "queries":
      [ { "name": "__testing" }
      , { "name": "bindings", "args": [ "key" ] }
      ] , "events":
      [ { "domain": "bindings", "type": "new", "attrs": [ "key", "value" ] }
      , { "domain": "session", "type": "expr", "attrs": [ "expr" ] }
      , { "domain": "session", "type": "obj_ops", "attrs": [ "key", "ops" ] }
      ]
    }
    bindings = function(key){
      ent:bindings.get(key)
    }
    install_ruleset_and_create_channel = defaction(debug_eci,url){
      every {
        ctx:eventQuery(eci=debug_eci,
          domain="wrangler", name="install_ruleset_request",
          attrs={"url":url},
          rid="io.picolabs.wrangler",queryName="installedRIDs",
          args={"tags":"console"}
        ) setting(rids)
        ctx:eventQuery(eci=debug_eci,
          domain="wrangler", name="new_channel_request",
          attrs={
            "tags":["result"],
            "eventPolicy":{"allow":[],"deny":[{"domain":"*","name":"*"}]},
            "queryPolicy":{"allow":[{"rid":rids.reverse().head(),"name":"result"}],"deny":[]}
          },rid="io.picolabs.wrangler",queryName="channels",
          args={"tags":"result"}
        ) setting(new_channel)
      }
      return {"rid":rids.reverse().head(),"eci":new_channel.head(){"id"}}
    }
    get_result_and_send = defaction(debug_eci,rid,eci){
      every {
        send_directive("_txt",{
          "content": http:get(<<#{meta:host}/sky/cloud/#{eci}/#{rid}/result>>){"content"}
        })
        event:send({"eci": debug_eci,
          "domain":"wrangler","type":"uninstall_ruleset_request",
          "attrs":{"rid": rid}
        })
        event:send({"eci": debug_eci,
          "domain": "wrangler", "type": "channel_deletion_request",
          "attrs": {"eci": eci}
        })
      }
    }
    tags = ["pico-debug-session"]
    eventPolicy = {"allow":
      [{"domain":"session","name":"*"}
      ,{"domain":"bindings","name":"new"}
      ],"deny":[]}
    queryPolicy = {"allow":[{"rid":meta:rid,"name":"*"}],"deny":[]}
  }
  rule intialization {
    select when wrangler ruleset_installed
      where event:attr("rids") >< meta:rid
    pre {
      pico_debug_channel = event:attr("pico_debug_channel")
    }
    if ent:bindings.isnull() then 
      wrangler:createChannel(tags,eventPolicy,queryPolicy) setting(channel)
    fired {
      ent:bindings := {}
      ent:channel_eci := channel{"id"}
      ent:pico_debug_channel_eci := pico_debug_channel{"id"}.klog("eci")
      raise wrangler event "new_child_request" attributes {
        "name": random:uuid()
      }
    }
  }
  rule install_krl_ruleset {
    select when wrangler new_child_created
    event:send({"eci": event:attr("eci"),
      "domain": "wrangler", "type": "install_ruleset_request",
      "attrs":{
        "absoluteURL": meta:rulesetURI,
        "rid": "pico-debug-krl",
      }
    })
  }
  rule save_krl_eci {
    select when session new_krl_eci
    fired {
      ent:krl_eci := event:attr("eci")
    }
  }
  rule set_binding {
    select when bindings new key re#(.+)# setting(key)
    fired {
      ent:bindings{key} := event:attr("value").decode()
    }
  }
  rule evaluate_expr {
    select when session expr expr re#(.+)# setting(expr)
    pre {
      eci = ent:pico_debug_channel_eci
      e = math:base64encode(" "+expr).replace(re#[+]#g,"-")
      url = <<#{meta:host}/sky/cloud/#{ent:krl_eci}/pico-debug-krl/rs.txt?ops=#{e}>>
      debug = url.klog("url")
    }
    every {
      install_ruleset_and_create_channel(eci,url) setting(rid_eci)
      get_result_and_send(eci,rid_eci{"rid"},rid_eci{"eci"})
    }
  }
  rule evaluate_obj_ops {
    select when session obj_ops key re#(.+)# ops re#(.+)# setting(key,ops)
    pre {
      eci = ent:pico_debug_channel_eci
      e = math:base64encode(ops).replace(re#[+]#g,"-")
      url = <<#{meta:host}/sky/cloud/#{ent:krl_eci}/pico-debug-krl/rs.txt?ops=#{e}>>
      debug = url.klog("url")
    }
    every {
      install_ruleset_and_create_channel(eci,url) setting(rid_eci)
      event:send({"eci": wrangler:parent_eci(), "domain": "debug", "type": "new_obj",
        "attrs": {"rid":rid_eci{"rid"}, "obj": bindings(key)}
      })
      get_result_and_send(eci,rid_eci{"rid"},rid_eci{"eci"})
    }
  }
}
