sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
  "use strict";

  return BaseController.extend("bcbsmn.com.cashreceipt.controller.App", {
    onInit: function () {
     console.log("test commit");
    }
  });
}
);
