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
  }
  rule intialization {
    select when wrangler ruleset_added
      where event:attr("rids") >< meta:rid
    if ent:bindings.isnull() then noop()
    fired {
      ent:bindings := {}
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
      eci = wrangler:parent_eci()
      picoId = engine:getPicoIDByECI(eci)
      e = math:base64encode(" "+expr).replace(re#[+]#g,"-")
      url = <<#{meta:host}/sky/cloud/#{eci}/pico-debug/rs.txt?ops=#{e}>>
    }
    every {
      engine:registerRuleset(url=url) setting(rid)
      engine:installRuleset(picoId,rid=rid)
      http:get(<<#{meta:host}/sky/cloud/#{eci}/#{rid}/result>>) setting(res)
      send_directive("_txt",{"content":res{"content"}})
      engine:uninstallRuleset(picoId,rid)
      engine:unregisterRuleset(rid)
    }
  }
  rule evaluate_obj_ops {
    select when session obj_ops key re#(.+)# ops re#(.+)# setting(key,ops)
    pre {
      eci = wrangler:parent_eci()
      picoId = engine:getPicoIDByECI(eci)
      e = math:base64encode(ops).replace(re#[+]#g,"-")
      url = <<#{meta:host}/sky/cloud/#{eci}/pico-debug/rs.txt?ops=#{e}>>
    }
    every {
      engine:registerRuleset(url=url) setting(rid)
      engine:installRuleset(picoId,rid=rid)
      event:send({"eci": eci, "domain": "debug", "type": "new_obj",
        "attrs": {"obj": bindings(key)}
      })
      http:get(<<#{meta:host}/sky/cloud/#{eci}/#{rid}/result>>) setting(res)
      send_directive("_txt",{"content":res{"content"}})
      engine:uninstallRuleset(picoId,rid)
      engine:unregisterRuleset(rid)
    }
  }
}
