sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/library",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/DialogType",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/TextArea",
    "sap/m/StandardListItem",
    "sap/m/List",
    'sap/m/MessagePopover',
    'sap/m/MessageItem',
    "sap/m/UploadCollectionParameter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/ValueState",
    "../model/formatter"],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController, JSONModel, mobileLibrary, MessageBox, Dialog, DialogType, Button, ButtonType, Label, Text, TextArea, StandardListItem, List, MessagePopover, MessageItem, UploadCollectionParameter, Filter, FilterOperator, ValueState, formatter) {
        "use strict";
        var oMessageTemplate = new MessageItem({
            type: 'Error',
            title: '{message}',
        });
        var oMessagePopover = new MessagePopover({
            items: {
                path: '/',
                template: oMessageTemplate
            }
        });
        return BaseController.extend("bcbsmn.com.cashreceipt.controller.Workingcash", {
            formatter: formatter,
            onInit: function () {

                this.bExtendTO = false;
                var that = this;
                window.onhashchange = function () {
                    if (!window.innerDocClick) {
                        if (that.bExtendTO) {
                            that.bExtendTO = false;
                            that._resetLock();
                        }
                    }
                }

                this.workingCashModel = new sap.ui.model.json.JSONModel();
                this.getView().setModel(this.workingCashModel, "workingCashModel");

                /** Model for Setting view properties */
                this.settingsModel = new sap.ui.model.json.JSONModel();
                this.getView().setModel(this.settingsModel, "settingsModel");

                /** Attachment Model */
                this.attachModel = new sap.ui.model.json.JSONModel();
                this.getView().setModel(this.attachModel, "attachModel");

                this.getRouter().getRoute("RouteWorkingCash").attachPatternMatched(this._onObjectMatched, this);
            },
            onAddRow: function () {
                var aData = this.getView().getModel("workingCashModel").getProperty("/GetReceiptDetails");
                aData.results.splice(0, 0,
                    {
                        "Crn": aData.Crn,
                        "Task": "",
                        "Itemno": "",
                        "Claimnumber": "",
                        "Assignedamt": "0.00",
                        "Memberid": "",
                        "Prn": "",
                        "Asgngroup": "",
                        "Status": "",
                        "Enabled": true
                    });
                this.getView().getModel("workingCashModel").setProperty("/GetReceiptDetails", aData);
                this.getView().byId("table").clearSelection(true);
            },
            onDeleteRow: function (oEvent) {
                var oTable = this.getView().byId("table");
                var itemIndex = oTable.getSelectedIndex();
                if (itemIndex != -1) {

                    var aData = this.getView().getModel("workingCashModel").getData();

                    /** Cannot delete a row that is in "Completed" status or 
                     if the item was re-assigned by another user or assigned to a different group*/

                    if (aData.GetReceiptDetails.results[itemIndex].Status === 'CO' ||
                        aData.GetReceiptDetails.results[itemIndex].Itemno != "") {
                        this._displayMessage("Error", "Task cannot be deleted.", MessageBox.Icon.Error, ValueState.Error);

                    } else {
                        aData.GetReceiptDetails.results.splice(itemIndex, 1);
                        this.getView().getModel("workingCashModel").setData(aData);
                        oTable.clearSelection(true);
                    }
                } else {
                    this._displayMessage("Error", "Select a row to delete.", MessageBox.Icon.Error, ValueState.Error);
                }
            },
            onCopyRow: function (oEvent) {
                var oTable = this.getView().byId("table");
                if (oTable.getSelectedIndex() != -1) {
                    /** get index of selected row */
                    var itemIndex = oTable.getSelectedIndex();
                    /** get table data*/
                    var aData = this.getView().getModel("workingCashModel").getProperty("/GetReceiptDetails");
                    /** Error if trying to split an item in Completed status */
                    if (aData.results[itemIndex].Enabled === false ||
                        aData.results[itemIndex].Status === 'CO') {
                        this._displayMessage("Error", "Locked task cannot be split.", MessageBox.Icon.Error, ValueState.Error);
                    } else {
                        /** add 1 to current index to insert the copied row below the selected row */
                        var newIndex = itemIndex + 1.
                        /** copy data from selected row and insert into json model*/
                        aData.results.splice(newIndex, 0,
                            {
                                "Crn": aData.results.Crn,
                                "Itemno": "",
                                "Task": aData.results[itemIndex].Task,
                                "Claimnumber": aData.results[itemIndex].Claimnumber,
                                "Assignedamt": aData.results[itemIndex].Assignedamt,
                                "Memberid": aData.results[itemIndex].Memberid,
                                "Prn": aData.results[itemIndex].Prn,
                                "Asgngroup": "",
                                "Status": "",
                                "Enabled": true

                            });
                        this.getView().getModel("workingCashModel").setProperty("/GetReceiptDetails", aData);
                        this.getView().byId("table").clearSelection(true); //removeSelections(true)                       
                    }
                } else {
                    /** Error if a row is not selected */
                    this._displayMessage("Error", "Select a row to split.", MessageBox.Icon.Error, ValueState.Error);
                }
            },
            onModify: function () {
                this._updateSettingModel(true, true, true, true, true, true, false);
            },
            onSubmit: function (oEvent) {
                var oError = this._validateFields();
                if (oError === false) {
                    this._updateCrnRequest();
                }
            },
            onChange: function (oEvent) {
                var oModel = this.getView().getModel();
                oModel.refreshSecurityToken();
                var oHeaders = oModel.oHeaders;
                var sToken = oHeaders["x-csrf-token"];
                var oUploadCollection = oEvent.getSource();
                var oCustomerHeaderToken = new sap.m.UploadCollectionParameter({
                    name: "x-csrf-token",
                    value: sToken
                });
                oUploadCollection.addHeaderParameter(oCustomerHeaderToken);
            },
            onBeforeUploadStarts: function (oEvent) {
                var oBindingCtx = oEvent.getSource().getBindingContext();
                var oCustomerHeaderSlug = new UploadCollectionParameter({
                    name: "slug",
                    value: oEvent.getParameter("fileName") + "," + this.getView().byId("fcrn").getValue()
                });
                oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);
            },
            onUploadComplete: function (oEvent) {
                this._setAttachmentModel(); // for upload collection
            },
            onTaskChange: function (oEvent) {
                var selectedValue = oEvent.getParameter("selectedItem").getKey();
                var aCells = oEvent.getSource().getParent().getCells();
                var oTargetCell = aCells[5];
                if (selectedValue == '02' || selectedValue == '08') {
                    var key = 'TR';
                    oTargetCell.setSelectedKey(key);
                } else {
                    var key = '';
                    oTargetCell.setSelectedKey(key);
                }
            },
            onFileDelete: function (oEvent) {
                var sId = oEvent.getParameter("item").sId; 
                var itemIndex = parseInt(sId.substring(sId.lastIndexOf('-') + 1));
                var oCrn = this.getModel("attachModel").getData().items[itemIndex].Crn;
                var oAttachmentNo = this.getModel("attachModel").getData().items[itemIndex].AttachmentNo;
                var sPath = "/AttachmentsSet(Crn='" + oCrn + "',AttachmentNo='" + oAttachmentNo + "')";
                this.getModel().remove(sPath);
                this._setAttachmentModel(); 
            },
            onViewComments: function (oEvent) {
                // get the row index
                this.itemIndex = oEvent.getSource().getParent().getIndex();

                // get data
                this.aData = this.getView().getModel("workingCashModel").getProperty("/GetReceiptDetails");

                if (!this.oCommentsDialog) {
                    this.oCommentsDialog = new Dialog({
                        type: DialogType.Message,
                        title: "Comments",
                        content: [
                            new Label({
                                text: "Enter Comments",
                                labelFor: "newNotes"
                            }),
                            new TextArea("newNotes", {
                                width: "100%",
                                rows: 5,
                                value: this.aData.results[this.itemIndex].newNotes,
                                enabled: this.aData.results[this.itemIndex].Enabled
                                ,
                                liveChange: function (oEvent1) {
                                    var sText = oEvent1.getParameter("value");
                                    this.oCommentsDialog.getBeginButton().setEnabled(sText.length > 0);
                                }.bind(this)
                            }),
                            new Label({
                                text: "Additional Comments",
                                labelFor: "historyNotes"
                            }),
                            new TextArea("historyNotes", {
                                width: "100%",
                                rows: 5,
                                value: this.aData.results[this.itemIndex].Notes,
                                enabled: false
                            })
                        ],
                        beginButton: new Button("btnok", {
                            type: ButtonType.Emphasized,
                            text: "Ok",
                            enabled: false,
                            press: function () {
                                var sText = sap.ui.getCore().byId("newNotes").getValue();
                                this.aData.results[this.itemIndex].newNotes = sText; //Latestnote
                                this.getView().getModel("workingCashModel").setProperty("/GetReceiptDetails", this.aData);
                                sap.ui.getCore().byId("btnok").setEnabled(false);
                                this.oCommentsDialog.close();
                            }.bind(this)
                        })
                        ,
                        endButton: new Button({
                            text: "Cancel",
                            press: function () {
                                sap.ui.getCore().byId("btnok").setEnabled(false);
                                this.oCommentsDialog.close();
                            }.bind(this)
                        })
                    });
                } else {
                    sap.ui.getCore().byId("newNotes").setValue(this.aData.results[this.itemIndex].newNotes);
                    sap.ui.getCore().byId("newNotes").setEnabled(this.aData.results[this.itemIndex].Enabled);
                    sap.ui.getCore().byId("historyNotes").setValue(this.aData.results[this.itemIndex].Notes);
                }
                this.oCommentsDialog.open();
            },
            handleMessagePopoverPress: function (oEvent) {
                oMessagePopover.toggle(oEvent.getSource());
            },
            onBack: function (oEvent) {
                var that = this;
                if (!this.oBackDialog) {
                    this.oBackDialog = new Dialog({
                        type: DialogType.Message,
                        title: "Confirm",
                        content: new Text({ text: "Changes will be lost. Do you want to Exit ?" }),
                        beginButton: new Button({
                            text: "Yes",
                            press: function () {
                                // Close the dialog back
                                this.oBackDialog.close();

                                // Reset Lock
                                this.bExtendTO = false;
                                this._resetLock();

                                // Navigate back to Dashboard view
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
            _onObjectMatched: function (oEvent) {
                // set Working Cash section as default section
                this.byId("ObjectPageLayout").setSelectedSection(this.byId("opsWorkingcash"));
                // get crn
                var sObjectId = oEvent.getParameter("arguments").Crn;
                this.getModel().metadataLoaded().then(function () {
                    var sObjectPath = this.getModel().createKey("DashboardSet", {
                        Crn: sObjectId,
                        Itemno: '000'
                    });
                    this._bindView("/" + sObjectPath);
                }.bind(this));
            },
            _bindView: function (sObjectPath) {
                this.hideBusyIndicator();
                var that = this;
                var oView = this.getView();

                var sNavigationPath = sObjectPath;
                this.getModel().read(sNavigationPath, {
                    urlParameters: {
                        "$expand": "GetReceiptDetails"
                    },
                    success: function (oData) {
                        /** set data for working cash model */
                        that.workingCashModel.setData(oData);

                        /** set the editable property for form fields */
                        that._updateSettingModel(false, false, false, false, false, false, true);

                        /** set the visible property for the validation errors button  */
                        that.getView().byId("fberrors").setProperty("visible", false);

                        /** set attachments model */
                        that._setAttachmentModel();

                        /** Set Interval Timer to extend the session time */
                        that.bExtendTO = true;
                        that.timeTrigger = new sap.ui.core.IntervalTrigger(120000);
                        that.timeTrigger.addListener(function () {
                            that._extendSessionTime();
                        });
                    }
                });
            },
            _toUppercase: function (oEvent) {
                var ipfield = oEvent.getSource();
                ipfield.setValue(ipfield.getValue().toUpperCase());
            },
            _extendSessionTime: function () {
                var that = this;
                if (that.bExtendTO) {
                    var oModel = this.getView().getModel();
                    oModel.callFunction("/ExtendSession", {
                        method: 'POST',
                        success: function (oData, oResponse) {
                            that.bExtendTO = true;
                        },
                        error: function () {
                            that.bExtendTO = false;
                        }
                    });
                }
            },
            _onClear: function () {
                this.attachModel.setData(null);
                this.workingCashModel.setData(null);
            },
            _setAttachmentModel: function () {
                var oCrn = this.getView().byId("fcrn").getValue();
                this.getOwnerComponent().getModel().read("/AttachmentsSet", {
                    filters: [new Filter("Crn", FilterOperator.EQ, oCrn)],
                    success: function (oData) {
                        var json = new JSONModel([]);
                        json.items = [];
                        for (var i = 0; i < oData.results.length; i++) {
                            var item = {
                                Crn: oData.results[i].Crn,
                                AttachmentNo: oData.results[i].AttachmentNo,
                                UploadedBy: oData.results[i].UploadedBy,
                                IsRemovable: oData.results[i].IsRemovable,
                                FileName: oData.results[i].FileName,
                                FileType: oData.results[i].FileType,
                                FileSize: oData.results[i].FileSize,
                                FileContent: oData.results[i].FileContent
                            };
                            json.items.push(item);
                        }
                        this.attachModel.setData(json);
                    }.bind(this),
                    error: function (oError) {
                        sap.m.MessageToast.show("Error occured reading data");
                    }
                });
            },
            _updateSettingModel: function (image, receiptinfo, person, payeeinfo, refundchk, headerrequired, itemsettings) {
                this.settingsModel.setData({
                    "imageEnabled": image,
                    "receiptinfoEnabled": receiptinfo,
                    "personEnabled": person,
                    "payeeinfoEnabled": payeeinfo,
                    "refundchkEnabled": refundchk,
                    "headerRequired": headerrequired
                });
                if (itemsettings === true) {
                    var oTable = this.getView().byId("table");
                    var aItems = this.workingCashModel.getData().GetReceiptDetails.results;

                    if (aItems.length > 0) {
                        for (var i = 0; i < aItems.length; i++) {
                            if (aItems[i].Status === "CO" || (aItems[i].Itemno != "" && aItems[i].Asgngroup != "TR")) {
                                aItems[i].Enabled = false;
                            } else {
                                aItems[i].Enabled = true;
                            }
                            this.getView().getModel("workingCashModel").setProperty("/GetReceiptDetails/results", aItems);
                        }
                    } else {
                        this.onAddRow();
                    }
                }
            },
            _updateItemSettings: function (aItem, oTask) {
                /** Make all cells editable */
                for (var i = 0; i < aItem.getCells().length; i++) {
                    aItem.getCells()[i].setProperty("enabled", true);
                }
                /** disable cells based on selected task */
                switch (true) {
                    /* Apply by OTHER and Update Cash */
                    case (oTask === '02' || oTask === '09'):
                        aItem.getCells()[3].setProperty("enabled", false);
                        aItem.getCells()[5].setProperty("enabled", false);
                        break;
                    /* Re-assign */
                    case (oTask === '05'):
                        aItem.getCells()[3].setProperty("enabled", false);
                        break;
                    /* Reverse */
                    case (oTask === '08'):
                        aItem.getCells()[5].setProperty("enabled", false);
                        break;
                    /* If none of the above tasks */
                    case (oTask === '00' || oTask === ""):
                        for (var i = 1; i < aItem.getCells().length; i++) {
                            aItem.getCells()[i].setProperty("enabled", false);
                        }
                        break;
                }
            },
            _validateFields: function () {
                var oError = false;
                var itemError;
                var aMessages = [];
                var aCheckamount;
                var aAsgnamount;

                if (this.getView().byId("fimage").getValue() === "") {
                    aMessages.push({ message: "Required field 'Image Number' is missing." });
                }
                if (this.getView().byId("fcheck").getValue() === "") {
                    aMessages.push({ message: "Required field 'Check Number' is missing." });
                }
                if (this.getView().byId("fdepositdt").getValue() === "") {
                    aMessages.push({ message: "Required field 'Deposit Date' is missing." });
                }
                if (this.getView().byId("fcmsdt").getValue() === "") {
                    aMessages.push({ message: "Required field 'CMS Close Date' is missing." });
                }
                if (this.getView().byId("famount").getValue() === "") {
                    aMessages.push({ message: "Required field 'Check Amount' is missing." });
                }
                if (this.getView().byId("fasgnamt").getValue() === "") {
                    aMessages.push({ message: "Required field 'Assigned Amount' is missing." });
                }

                var aData = this.getView().getModel("workingCashModel").getData();
                /* Check if assigned amount is not greater than Check amount */
                var aAsgnamount = parseFloat(aData.Assignedamt).toFixed(2);
                aCheckamount = parseFloat(aData.Checkamount).toFixed(2);
                if (parseFloat(aAsgnamount) > parseFloat(aCheckamount)) {
                    aMessages.push({ message: "Assigned amount cannot be greater than check amount." });
                }

                if (aData.GetReceiptDetails.results.length > 0) {
                    var totalAmount = 0.00;

                    /* Check required fields based on selected Task */
                    for (var i = 0; i < aData.GetReceiptDetails.results.length; i++) {

                        itemError = false;
                        var rowNumber = i + 1;

                        /* calculated total assigned amount */
                        totalAmount += parseFloat(aData.GetReceiptDetails.results[i].Assignedamt);

                        /* Check if item is not in Completed Status */
                        if (aData.GetReceiptDetails.results[i].Enabled === true) { //Status != 'CO' 

                            switch (aData.GetReceiptDetails.results[i].Task) {
                                case '00':
                                    aMessages.push({ message: "Row " + rowNumber + " : " + "Select a Task." });
                                    itemError = true;
                                    break;
                                case '02':
                                    if (aData.GetReceiptDetails.results[i].Assignedamt === '' ||
                                        aData.GetReceiptDetails.results[i].Assignedamt < 0) {
                                        aMessages.push({ message: "Row " + rowNumber + " : " + "Enter a valid amount." });
                                        itemError = true;
                                    }
                                    break;
                                case '04':
                                    if (aData.GetReceiptDetails.results[i].Assignedamt === '' ||
                                        aData.GetReceiptDetails.results[i].Assignedamt < 0) {
                                        aMessages.push({ message: "Row " + rowNumber + " : " + "Enter a valid amount." });
                                        itemError = true;
                                    }
                                    if (aData.GetReceiptDetails.results[i].Memberid === '') {
                                        aMessages.push({ message: "Row " + rowNumber + " : " + "Enter Member Id." });
                                        itemError = true;
                                    }
                                    if (aData.GetReceiptDetails.results[i].Asgngroup === 'ORCCOL' &&
                                        aData.GetReceiptDetails.results[i].Prn === "") {
                                        aMessages.push({ message: "Row " + rowNumber + " : " + "Enter 'Payment Reduction Number' for group 'ORC Collect'." });
                                        itemError = true;
                                    }
                                    if (aData.GetReceiptDetails.results[i].Asgngroup === '') {
                                        aMessages.push({ message: "Row " + rowNumber + " : " + "Select a Group'." });
                                        itemError = true;
                                    }
                                    break;
                                case '05':
                                    if (aData.GetReceiptDetails.results[i].Assignedamt === '' ||
                                        aData.GetReceiptDetails.results[i].Assignedamt < 0) {
                                        aMessages.push({ message: "Row " + rowNumber + " : " + "Enter a valid amount." });
                                        itemError = true;
                                    }
                                    if (aData.GetReceiptDetails.results[i].Memberid === '') {
                                        aMessages.push({ message: "Row " + rowNumber + " : " + "Enter Member Id." });
                                        itemError = true;
                                    }
                                    if (aData.GetReceiptDetails.results[i].Asgngroup === '') {
                                        aMessages.push({ message: "Row " + rowNumber + " : " + "Select a Group'." });
                                        itemError = true;
                                    }
                                    break;
                                case '08':
                                    if (aData.GetReceiptDetails.results[i].Assignedamt === '' ||
                                        aData.GetReceiptDetails.results[i].Assignedamt < 0) {
                                        aMessages.push({ message: "Row " + rowNumber + " : " + "Enter a valid amount." });
                                        itemError = true;
                                    }
                                    break;
                                case '01':
                                    break;
                                case '03':
                                    break;
                                case '06':
                                    break;
                                case '07':
                                    break;
                                case '09':
                                    break;
                                default:
                                    aMessages.push({ message: "Row " + rowNumber + " : " + "Select a Task." });
                                    itemError = true;
                                    break;
                            }
                        }
                        if (itemError === true) {
                            aData.GetReceiptDetails.results[i].Status = "ER";
                        } else {
                            aData.GetReceiptDetails.results[i].Status = "";
                        }
                        this.getView().getModel("workingCashModel").setData(aData);
                    }
                    /* Check total amount in Receipt Details table */
                    /* Error if total amount is greater than Assigned amount */
                    var oAsgnamt = parseFloat(aData.Assignedamt).toFixed(2);
                    totalAmount = parseFloat(totalAmount).toFixed(2);
                    if (parseFloat(totalAmount) > parseFloat(oAsgnamt)) {
                        // if (parseFloat(totalAmount).toFixed(2) > parseFloat(aData.Assignedamt).toFixed(2)) {
                        aMessages.push({
                            message: "Total amount in 'Receipt Details' section $" + parseFloat(totalAmount).toFixed(2) +  // totalAmount.toLocaleString("en-US") +
                                " cannot be greater than the Assigned amount "
                        });
                    }
                    /* Error if total amount is less than the Assigned amount */
                    if (parseFloat(totalAmount) < parseFloat(oAsgnamt)) {
                        var oPendingamt = parseFloat(oAsgnamt) - parseFloat(totalAmount);
                        aMessages.push({
                            message: "$" + parseFloat(oPendingamt).toFixed(2) + " has not been assigned. Assign full amount."
                        });
                    }

                } else {
                    /** No Tasks added */
                    aMessages.push({ message: "Add atleast one Task under 'Receipt Details'." });
                }

                if (aMessages.length > 0) {
                    oError = true;
                    this.getView().byId("fberrors").setProperty("visible", true);
                    this._showMessage(aMessages);
                } else {
                    this.getView().byId("fberrors").setProperty("visible", false);
                }
                return oError;
            },
            _updateCrnRequest: function () {
                var that = this;
                if (!this.oApproveDialog) {
                    this.oApproveDialog = new Dialog({
                        type: DialogType.Message,
                        title: "Confirm",
                        draggable: true,
                        content: new Text({
                            text: "Are you sure you want to submit your changes?"
                        }),
                        beginButton: new Button({
                            text: "Yes",
                            press: function () {
                                this.oApproveDialog.close();
                                var oCrnData = {};
                                this._getRequestData(oCrnData);

                                /* open the busy dialog */
                                that.oBusyDialog = new sap.m.BusyDialog();
                                that.oBusyDialog.setText("Request is being updated.....");
                                that.oBusyDialog.open();

                                var oModel = this.getView().getModel();
                                oModel.create("/DashboardSet", oCrnData, {
                                    success: function (oData, oResponse) {
                                        that.oBusyDialog.close();
                                        MessageBox.information("Request has been updated successfully.", {
                                            icon: sap.m.MessageBox.Icon.SUCCESS,
                                            actions: [MessageBox.Action.OK],
                                            onClose: function () {

                                                // Reset Lock
                                                that.bExtendTO = false;
                                                that._resetLock();

                                                // Close the dialog box
                                                //    that.oApproveDialog.close();

                                                // Navigate back to Dashboard view
                                                that.getRouter().navTo("RouteDashboard");
                                            }
                                        });
                                    },
                                    error: function (oResponse) {
                                        that.oBusyDialog.close();
                                        //   that.oApproveDialog.close();
                                        var errorObj1 = JSON.parse(oResponse.responseText);
                                        sap.m.MessageBox.show(
                                            errorObj1.error.message.value,
                                            sap.m.MessageBox.Icon.ERROR,
                                            "Error"
                                        );
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
            },
            _getRequestData(oCrnData) {
                var child = [];
                var items = [];
                var str; var cmsdate;
                var oClaimnumber; var oPrn;
                oCrnData.Crn = this.workingCashModel.getData().Crn;
                oCrnData.Imagenumber = this.workingCashModel.getData().Imagenumber.toString();
                oCrnData.Checknumber = this.workingCashModel.getData().Checknumber.toString();
                oCrnData.Checkamount = parseFloat(this.workingCashModel.getData().Checkamount).toFixed(2);
                oCrnData.Assignedamt = parseFloat(this.workingCashModel.getData().Assignedamt).toFixed(2);
                oCrnData.Casenumber = this.workingCashModel.getData().Casenumber.toString();
                oCrnData.Person = this.workingCashModel.getData().Person;
                oCrnData.Payeename = this.workingCashModel.getData().Payeename;
                oCrnData.Payeeid = this.workingCashModel.getData().Payeeid.toString();
                oCrnData.Street = this.workingCashModel.getData().Street;
                oCrnData.City = this.workingCashModel.getData().City;
                oCrnData.State = this.workingCashModel.getData().State;
                oCrnData.Zip = this.workingCashModel.getData().Zip.toString();
                str = new Date(this.workingCashModel.getData().Depositdate).toISOString().substring(0, 22);
                oCrnData.Depositdate = str;
                cmsdate = new Date(this.workingCashModel.getData().Cmsclosedate).toISOString().substring(0, 22);
                oCrnData.Cmsclosedate = cmsdate;

                items = this.workingCashModel.getData().GetReceiptDetails.results;
                for (var i = 0; i < items.length; i++) {
                    /** check is Task was editable, do not send locked tasks as they cannot be edited */

                    if (items[i].Enabled === true) {
                        if (items[i].Claimnumber === "") {
                            oClaimnumber = items[i].Claimnumber;
                        } else {
                            oClaimnumber = items[i].Claimnumber.toString();
                        }
                        if (items[i].Prn === "") {
                            oPrn = items[i].Prn;
                        } else {
                            oPrn = items[i].Prn.toString();
                        }
                        child.push({
                            Crn: oCrnData.Crn,
                            Itemno: items[i].Itemno,
                            Claimnumber: oClaimnumber,
                            Assignedamt: parseFloat(items[i].Assignedamt).toFixed(2),
                            Memberid: items[i].Memberid.toString(),
                            Prn: oPrn,
                            Asgngroup: items[i].Asgngroup,
                            Notes: items[i].newNotes, //Latestnote,
                            Status: items[i].Status,
                            Task: items[i].Task,
                        });
                    }
                }
                oCrnData.GetReceiptDetails = child;
                return oCrnData;
            },
            _showMessage: function (oMessages) {
                /** Set the model for the message popover */
                var oModel1 = new JSONModel();
                oModel1.setData(oMessages);
                oMessagePopover.setModel(oModel1);

                /** Dialog box to display all messages */
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
            _validateNumericField: function (oEvent) {
                var regex = /^([0-9])*$/;
                var input = oEvent.getParameter("newValue");
                if (input !== "" && !input.match(regex)) {
                    this._displayMessage("Error", "Enter numeric values only.", sap.m.MessageBox.Icon.Error, ValueState.Error);
                }
            },
            _validateAmountField: function (oEvent) {
                var regex = /^([0-9]|[.]|[,])*$/;
                var input = oEvent.getParameter("newValue");
                if (input !== "" && !input.match(regex)) {
                    this._displayMessage("Error", "Enter a valid amount.", MessageBox.Icon.Error, ValueState.Error);
                }
            },
            _displayMessage: function (oTitle, oMessage, oIcon, oValueState) {
                this.oMessageDialog = new Dialog({
                    type: DialogType.Message,
                    draggable: true,
                    title: oTitle,
                    state: oValueState,
                    content: new Text({ text: oMessage }),
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
            _resetLock: function () {
                /** clear Timer */
                if (this.timeTrigger) {
                    this.timeTrigger.destroy();
                }
                /** Unlock the CRN by releasing the lock */
                var sCrn = this.getView().byId("fcrn").getValue();
                var oModel = this.getModel();
                oModel.callFunction("/ResetLock", {
                    method: 'POST',
                    urlParameters: {
                        Crn: sCrn
                    },
                    error: function (oError) {

                    }
                });
            }
        });
    });
