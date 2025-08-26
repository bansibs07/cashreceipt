sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/library",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/DialogType",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/m/Text",
    "sap/ui/core/ValueState"],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController, JSONModel, mobileLibrary, MessageBox, Dialog, DialogType, Button, ButtonType, Text, ValueState) {
        "use strict";

        return BaseController.extend("bcbsmn.com.cashreceipt.controller.Addcash", {
            onInit: function () {
                this.addCashModel = new sap.ui.model.json.JSONModel();
                this.getView().setModel(this.addCashModel, "addCashModel");
                var depdt = this.getView().byId("fdepositdate").setProperty("value", "");
                var cmsdt = this.getView().byId("fcmsclosedate").setProperty("value", "");
            },
            onClear: function (oEvent) {
                /** clear JSON model */
                this.addCashModel.setData(null);
                /** clear value state for all form fields */
                var e = this.getView().byId("sfaddcash").getContent();
                for (var t = 0; t < e.length; t++) {
                    if (e[t].sParentAggregationName === "fields") {
                        e[t].setValueState(sap.ui.core.ValueState.None);
                    }
                }
                var f = this.getView().byId("sfaddcashreceiptinfo").getContent();
                for (var t = 0; t < f.length; t++) {
                    if (f[t].sParentAggregationName === "fields") {
                        f[t].setValueState(sap.ui.core.ValueState.None);
                    }
                }
            },
            checkSimpleForm: function (formId) {
                var oError;
                var Cell = this.getView().byId(formId).getContent();
                for (var i = 0; i < Cell.length; i++) {
                    if (Cell[i].sParentAggregationName === "fields" &
                        Cell[i].getProperty("required") === true) {
                        if (Cell[i].mProperties.hasOwnProperty("value") === true &
                            Cell[i].getProperty("value") === "") {
                            Cell[i].setValueState(sap.ui.core.ValueState.Error);
                            oError = true;
                        } else {
                            Cell[i].setValueState(sap.ui.core.ValueState.None);
                        }
                    }
                }
                return oError;
            },

            onSubmit: function () {
                /** check required fields */
                var oError = this._checkRequiredFields();
                if (oError === false) {
                    /** Check assigned amount should not be greater than check amount*/
                    var oRequestData = this.getView().getModel("addCashModel").getData();
                    var aAsgnamount = parseFloat(oRequestData.Assignedamt).toFixed(2);
                    var aCheckamount = parseFloat(oRequestData.Checkamount).toFixed(2);
                 
                    if ( parseFloat(aAsgnamount) > parseFloat(aCheckamount)) {
                        this.getView().byId("fasgamt").setValueState("Error");
                        sap.m.MessageBox.show(
                            "Assigned amount cannot be greater than check amount.",
                            sap.m.MessageBox.Icon.ERROR,
                            "Error"
                        );
                    } else {
                        /** create request */
                        this._createRequest();
                    }
                }
            },
            onBack: function (oEvent) {
                var that = this;
                if (!this.oBackDialog) {
                    this.oBackDialog = new Dialog({
                        type: DialogType.Message,
                        title: "Confirm",
                        content: new Text({ text: "Data will be lost. Do you want to Exit ?" }),
                        beginButton: new Button({
                            text: "Yes",
                            press: function () {
                                this.oBackDialog.close();
                                /** clear form  */
                                this.onClear();
                                /** route to dashbaord view */
                                this.getRouter().navTo("RouteDashboard");
                            }.bind(this)
                        }),
                        endButton: new Button({
                            text: "No",
                            press: function () {
                                this.oBackDialog.close();
                            }.bind(this)
                        })
                    });
                }
                this.oBackDialog.open();
            },
            _toUppercase: function (oEvent) {
                var ipfield = oEvent.getSource();
                ipfield.setValue(ipfield.getValue().toUpperCase());
            },
            _validateNumericField: function (oEvent) {
                var regex = /^([0-9])*$/;
                var input = oEvent.getParameter("newValue");
                if (input !== "" && !input.match(regex)) {
                    this._showMessage("Error", ValueState.Error, "Enter numeric values only");
                }
            },
            _validateAmountField: function (oEvent) {
                var regex = /^([0-9]|[.])*$/;
                var input = oEvent.getParameter("newValue");
                if (input !== "" && !input.match(regex)) {
                    this._showMessage("Error", ValueState.Error, "Enter a valid amount");
                }
            },
            _showMessage: function (oTitle, oValueState, oText) {

                this.oMessageDialog = new Dialog({
                    type: DialogType.Message,
                    draggable: true,
                    title: oTitle,
                    state: oValueState,
                    content: new Text({
                        text: oText
                    }),
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: "OK",
                        press: function () {
                            this.oMessageDialog.close();
                        }.bind(this)
                    })
                });

                this.oMessageDialog.open();
            },
            _checkRequiredFields: function () {
                // check all required fields 
                var oError1 = this.checkSimpleForm("sfaddcash");
                var oError2 = this.checkSimpleForm("sfaddcashreceiptinfo");
                if (oError1 === true || oError2 === true) {
                    this._showMessage("Error", ValueState.Error, "Please make an entry in all the required fields");
                    return true;
                } else {
                    return false;
                }
            },
            _createRequest: function () {
                var that = this;
                if (!this.oApproveDialog) {
                    this.oApproveDialog = new Dialog({
                        type: DialogType.Message,
                        title: "Confirm",
                        draggable: true,
                        content: new Text({ text: "Are you sure you want to submit your request ?" }),
                        beginButton: new Button({
                            text: "Yes",
                            press: function () {
                                this.oApproveDialog.close();

                                /* open the busy dialog */
                                that.oBusyDialog = new sap.m.BusyDialog();
                                that.oBusyDialog.setText("Request is being submitted.....");
                                that.oBusyDialog.open();
                                /* call the oData */
                                var oRequestData = that.getView().getModel("addCashModel").getData();
                                var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZFI_CASH_RECEIPTS_SRV");
                                oModel.create("/AddCashSet", oRequestData, null,
                                    function (oData, oResponse) {
                                        /* close the busy dialog */
                                        that.oBusyDialog.close();
                                        /** read the success message */ 
                                        var sCompleteMessage = oResponse.headers["sap-message"];
                                        sCompleteMessage = JSON.stringify(sCompleteMessage);
                                        var oMessage = $(JSON.parse(sCompleteMessage)).find("message").first().text();

                                        MessageBox.information(oMessage, {
                                            icon: sap.m.MessageBox.Icon.SUCCESS,
                                            actions: [MessageBox.Action.OK],
                                            onClose: function () {
                                                /** clear form  */
                                                that.onClear();
                                                /** route to dashbaord view */
                                                that.getRouter().navTo("RouteDashboard");

                                            }
                                        });
                                    },
                                    function (oResponse) {
                                        /* close the busy dialog */
                                        that.oBusyDialog.close();
                                        var oMessage = $(oResponse.response.body).find("message").first().text();
                                        that._showMessage("Error", ValueState.Error, oMessage);
                                    }
                                );

                            }.bind(this)
                        }),
                        endButton: new Button({
                            text: "No",
                            press: function () {
                                this.oApproveDialog.close();
                            }.bind(this)
                        })
                    });
                }
                this.oApproveDialog.open();
            }
        });
    });
