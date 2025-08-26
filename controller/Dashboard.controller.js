sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter",
    "sap/ui/model/FilterOperator",
    "sap/m/GroupHeaderListItem",
    "sap/ui/Device",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox"],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController, JSONModel, Filter, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, MessageBox) {
        "use strict";

        return BaseController.extend("bcbsmn.com.cashreceipt.controller.Dashboard", {
            onInit: function () {
                var oModel = this.getOwnerComponent().getModel();
                oModel.setSizeLimit(99999);

                var oList = this.byId("table");
                this._oList = oList;
                this._mViewSettingsDialogs = {};
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                this.oBusyDialog = new sap.m.BusyDialog();
                oRouter.getRoute("RouteDashboard").attachPatternMatched(this._onMasterMatched, this);
            },
            _onMasterMatched: function () {
                this.showBusyIndicator();
                this.onRefresh();
                this._updateListItemCount();
                this.hideBusyIndicator();
            },
            onUploadCash: function (oEvent) {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteUploadCash", {
                    bReplace: false
                });
            },
            onAddCash: function (oEvent) {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteAddCash", {
                    bReplace: false
                });
            },
            onRefresh: function () {               
                this._oList.clearSelection(true);
                this._oList.getBinding("rows").refresh();
            },
            onSelectionChange: function (oEvent) {
                this.showBusyIndicator();
                var oSelectedItem = oEvent.getParameter("rowIndex");
                if (oSelectedItem != -1) {
                    var oModel = this.getView().byId("table").getContextByIndex(oSelectedItem).getObject();

                    /** Check if request is locked. If not locked navigate to working cash view */
                    this._lockCrn(oModel.Crn);
                }
            },
            onClearFilters: function () {
                /** Clear all filters on table columns */
                var aColumns = this._oList.getColumns();
                for (var i = 0; i < aColumns.length; i++) {
                    this._oList.filter(aColumns[i], null);
                }
            },
            _updateListItemCount: function () {
                var that = this;
                var oBinding = this.getView().byId("table").getBinding("rows");
                oBinding.attachChange(function (sReason) {
                    that.getView().byId("tTabHeader").setText("My Dashboard (" + oBinding.getLength() + ")");
                });
            },
            _lockCrn: function (sCrn) {
                this.Crn = sCrn;
                var oModel = this.getView().getModel();
                oModel.callFunction("/SetLock", {
                    method: 'POST',
                    urlParameters: {
                        Crn: sCrn
                    },
                    success: this._navToWorkingCash.bind(this),
                    error: this._showLockedMessage.bind(this)
                });
            },
            _navToWorkingCash: function (oData, oResponse) {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteWorkingCash", {
                    Crn: this.Crn
                });
            },
            _showLockedMessage: function (oError) {
                this.hideBusyIndicator();
                var that = this;
                var oErrObj = JSON.parse(oError.responseText);
                var oErrorDetails = oErrObj.error.innererror.errordetails;
                var oErrorMessage = oErrorDetails[0].message;
                sap.m.MessageBox.show(oErrorMessage, {
                    icon: sap.m.MessageBox.Icon.ERROR,
                    title: "User Lock",
                    actions: [sap.m.MessageBox.Action.OK],
                    onClose: function () {    
                        that.onRefresh();
                    }
                });
            }
        });
    });
