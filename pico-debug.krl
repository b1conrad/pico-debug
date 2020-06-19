ruleset pico-debug {
  meta {
    shares __testing, rs
  }
  global {
    __testing = { "queries":
      [ { "name": "__testing" },
        { "name": "rs", "args": [ "ops" ] }
      ] , "events":
      [ { "domain": "console", "type": "expr", "attrs": [ "obj", "ops" ] }
      ]
    }
    um = <<
    use module io.picolabs.wrangler alias wrangler
    use module io.picolabs.subscription alias subs
    use module io.picolabs.visual_params alias v_p
    >>
    mt = <<
  meta {#{um}shares result
  }
>>
    rs = function(ops){
      rsn = random:uuid();
      e = ops.math:base64decode();
      <<ruleset #{rsn} {#{mt}  global {
    result=function(){
      ent:obj#{e}
    }
  }
  rule set_obj {
    select when console new_obj
    fired {
      ent:obj := event:attr("obj")
    }
  }
}>>
    }
  }
  rule create_child_pico {
    select when console expr
    pre {
      obj = event:attr("obj").decode()
      ops = event:attr("ops")
    }
    if ops then noop()
    fired {
      raise wrangler event "new_child_request" attributes {
        "name": random:uuid(), "rids": [meta:rid],
        "obj": obj, "ops": ops, "txn_id": meta:txnId
      }
    }
  }
  rule evaluate_expression {
    select when wrangler new_child_created
      where event:attr("rs_attrs"){"txn_id"} == meta:txnId
        || event:attr("txn_id") == meta:txnId
    pre {
      obj = event:attr("rs_attrs"){"obj"} || event:attr("obj")
      ops = event:attr("rs_attrs"){"ops"} || event:attr("ops")
      e = ops.math:base64encode().replace(re#[+]#g,"-")
      eci = event:attr("eci")
      url = <<#{meta:host}/sky/cloud/#{eci}/pico-debug/rs.txt?ops=#{e}>>
      picoId = event:attr("id")
    }
    if ops then
    every {
      engine:registerRuleset(url=url) setting(rid)
      engine:installRuleset(picoId,rid=rid)
      event:send({"eci": eci, "domain": "console", "type": "new_obj",
        "attrs": {"obj": obj}
      })
      http:get(<<#{meta:host}/sky/cloud/#{eci}/#{rid}/result>>) setting(res)
      send_directive("_txt",{"content":res{"content"}})
      engine:uninstallRuleset(picoId,rid)
      engine:unregisterRuleset(rid)
    }
    always {
      raise wrangler event "child_deletion" attributes event:attrs
    }
  }
}
