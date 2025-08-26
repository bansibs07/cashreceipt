/* global jszip:true */
/* global xlsxupload:true */
sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "./jszip",
    "./xlsxupload",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/DialogType",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/m/Text",
    "sap/m/StandardListItem",
    "sap/m/List",
    "sap/ui/core/ValueState"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController, JSONModel, zipjs, xlsxuploadjs, MessageBox, Dialog, DialogType, Button, ButtonType, Text, StandardListItem, List, ValueState) {
        "use strict";

        return BaseController.extend("bcbsmn.com.cashreceipt.controller.Uploadcash", {
            onInit: function () {
                this.fileDataModel = new sap.ui.model.json.JSONModel();
                this.getView().setModel(this.fileDataModel, "fileDataModel");

            },
            onUploadFile: function (e) {
                this._import(e.getParameter("files") && e.getParameter("files")[0]);
            },
            _import: function (file) {
                var that = this;
                var excelData = {};
                if (file && window.FileReader) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var data = e.target.result;
                        var workbook = XLSX.read(data, {
                            type: 'binary'
                        });
                        workbook.SheetNames.forEach(function (sheetName) {
                            /** Here is your object for every sheet in workbook */
                            excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);

                        });

                        /** validate file data */
                        var oError = that._validatefile(excelData);

                        if (oError === false) {
                            /** Setting the data to the local model */
                            that.fileDataModel.setData({
                                items: excelData
                            });

                            that.fileDataModel.refresh(true);

                            if (excelData.length <= 0) {
                                sap.m.MessageBox.show(
                                    "File contains no data.",
                                    sap.m.MessageBox.Icon.ERROR,
                                    "Error"
                                );
                            }
                        } else {
                            that.onClear();
                        }
                    };
                    reader.onerror = function (ex) {
                        console.log(ex);
                    };
                    reader.readAsBinaryString(file);
                }
            },
            onClear: function (oEvent) {
                this.getView().byId("FileUploaderId").clear();
                this.fileDataModel.setData(null);
            },
            onBack: function (oEvent) {

                if (this.getView().byId("FileUploaderId").getValue()) {

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
                } else {
                    /** route to dashbaord view */
                    this.getRouter().navTo("RouteDashboard");
                }
            },
            onSubmit: function () {
                var that = this;
                var ar1 = [];
                ar1 = this.fileDataModel.getData();
                if (ar1 != null && (ar1.items && ar1.items.length > 0)) {
                    if (!this.oApproveDialog) {
                        this.oApproveDialog = new Dialog({
                            type: DialogType.Message,
                            title: "Confirm",
                            draggable: true,
                            content: new Text({
                                text: "Are you sure you want to upload this file ?"
                            }),
                            beginButton: new Button({
                                text: "Yes",
                                press: function () {
                                    this.oApproveDialog.close();
                                    var str; var cmsdt; var ar = [];
                                    var RequestBody = {};
                                    RequestBody.Crn = "9999999"; //dummy crn number for creating deep entity
                                    var child = [];
                                    ar = this.fileDataModel.getData();

                                    for (var i = 0; i < ar.items.length; i++) {
                                        str = new Date(ar.items[i].DepositDate).toISOString().substring(0, 22);
                                        cmsdt = new Date(ar.items[i].CMSCloseDate).toISOString().substring(0, 22);
                                        child.push({
                                            CheckNumber: ar.items[i].CheckNumber,
                                            PayeeName: ar.items[i].PayeeName,
                                            ImageNumber: ar.items[i].ImageNumber,
                                            CheckAmount: ar.items[i].CheckAmount,
                                            CRN: ar.items[i].CRN,
                                            DepositDate: str,                                             
                                            AssignedAmt: ar.items[i].AssignedAmt,
                                            CMSCloseDate: cmsdt
                                        });
                                    }
                                    RequestBody.FileToData = child;

                                    /* open the busy dialog */
                                    that.oBusyDialog = new sap.m.BusyDialog();
                                    that.oBusyDialog.setText("Request is being submitted.....");
                                    that.oBusyDialog.open();

                                    var oModel = this.getView().getModel();
                                    oModel.create("/UploadCashSet", RequestBody, {
                                        success: function (oData, oResponse) {
                                            that.oBusyDialog.close();

                                            MessageBox.information("File uploaded successfully.", {
                                                icon: sap.m.MessageBox.Icon.SUCCESS,
                                                actions: [MessageBox.Action.OK],
                                                onClose: function () {
                                                    /** clear the add Cash view and go back to dashboard view */
                                                    that.onClear();
                                                    /** route to dashboard view */
                                                    that.getRouter().navTo("RouteDashboard");
                                                }
                                            });
                                        },
                                        error: function (oResponse) {
                                            that.oBusyDialog.close();

                                            var oErrorObj = JSON.parse(oResponse.responseText);
                                            var oErrorDetails = oErrorObj.error.innererror.errordetails;
                                            var aErrors = [];

                                            for (var i = 0; i < oErrorDetails.length; i++) {

                                                if (!oErrorDetails[i].message) {
                                                    continue;
                                                }
                                                var oNewError = {};
                                                oNewError.type = sap.ui.core.MessageType.Error;
                                                oNewError.message = oErrorDetails[i].message;
                                                oNewError.title = oErrorDetails[i].code;
                                                aErrors.push(oNewError);
                                            }
                                            if (aErrors.length > 0) {
                                                that._showMessage(aErrors);
                                                return;
                                            }
                                        }
                                    });
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
                } else {
                    sap.m.MessageBox.show(
                        "Table is empty. There is no data to Submit",
                        sap.m.MessageBox.Icon.ERROR,
                        "Error"
                    );
                }
            },
            _toUppercase: function (oEvent) {
                var ipfield = oEvent.getSource();
                ipfield.setValue(ipfield.getValue().toUpperCase());
            },
            _showMessage: function (oMessages) {
                var oModel = new JSONModel();
                oModel.setData(oMessages);
                var oMessageView = this._getMessageView();
                oMessageView.setModel(oModel, "Message");
                this.oDialog = new sap.m.Dialog({
                    contentHeight: "100px",
                    resizable: true,
                    draggable: true,
                    verticalScrolling: true,
                    content: oMessageView,
                    title: "Validation Errors",
                    state: "Error",
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: function () {
                            this.getParent().close();
                        }
                    })
                });
                this.oDialog.open();
            },
            _getMessageView: function () {
                if (!this.oMessageView) {
                    var oMessageTemplate = new StandardListItem({
                        title: "{Message>message}",
                        icon: "sap-icon://arrow-right"
                    });
                    this.oMessageView = new List({
                        items: {
                            path: "Message>/",
                            template: oMessageTemplate
                        }
                    });
                }
                return this.oMessageView;
            },
            _validatefile(fileData) {
                var rowNumber;
                var oError = false;
                var aMessages = [];

                for (var i = 0; i < fileData.length; i++) {
                    rowNumber = i + 2;
                    if (fileData[i].CRN.length > 7) {
                        // Error
                        aMessages.push({ message: "Row " + rowNumber + " : " + "CRN # " + fileData[i].CRN + " cannot be greater than 7 digits." });
                    }
                    if (fileData[i].CheckNumber.length > 13) {
                        // Error
                        aMessages.push({ message: "Row " + rowNumber + " : " + "Check Number" + fileData[i].CheckNumber + " cannot be greater than 13 digits." });
                    }
                    if (fileData[i].ImageNumber.length > 12) {
                        // Error
                        aMessages.push({ message: "Row " + rowNumber + " : " + "Image Number" + fileData[i].ImageNumber + " cannot be greater than 12 digits." });
                    }
                    if (fileData[i].PayeeName.length > 35) {
                        // Error
                        aMessages.push({ message: "Row " + rowNumber + " : " + "Payee Name" + fileData[i].PayeeName + " cannot be greater than 35 characters." });
                    }
                    // translate Payee name to uppercase
                    fileData[i].PayeeName = fileData[i].PayeeName.toUpperCase();                   
                    var aAsgnamount = parseFloat(fileData[i].AssignedAmt).toFixed(2);
                    var aCheckamount = parseFloat(fileData[i].CheckAmount).toFixed(2);
                    if ( parseFloat(aAsgnamount) > parseFloat(aCheckamount) ) {
                        // Error
                        aMessages.push({ message: "Row " + rowNumber + " : " + "Assigned amount cannot be greater than check amount." });
                    }
                    if (aMessages.length > 0) {
                        oError = true;
                        this._showMessage(aMessages);
                    }
                    return oError;
                }
            },
            _showMessage: function (oMessages) {
                var oModel = new JSONModel();
                oModel.setData(oMessages);
                var oMessageView = this._getMessageView();
                oMessageView.setModel(oModel, "Message");
                this.oDialog = new sap.m.Dialog({
                    contentHeight: "100px",
                    resizable: true,
                    draggable: true,
                    verticalScrolling: true,
                    content: oMessageView,
                    title: "Validation Errors",
                    state: "Error",
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: function () {
                            this.getParent().close();

                        }
                    })
                });
                this.oDialog.open();
            },
        });
    });
