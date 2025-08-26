sap.ui.define([], () => {
    "use strict";

    return {
        enableTask(oKey) {
            /** disable dropdown values for 'Tasks' that are not relevant for Treasury  */
            if (oKey) {
                if (  oKey == '01' || oKey == "02" || oKey == "03" || oKey == "06" || 
                      oKey == "07" || oKey == "09" || oKey == "10" ) {
                    return false;
                }
            }
        },
        disableGroup(oKey) {
            /** disable dropdown values for 'Group' that are not relevant for Treasury  */
            if (oKey) {
                if( oKey == 'ORCV97' || oKey == 'ORCMO' || oKey == 'ORCRDP' || oKey == 'ORCVCK' || oKey == 'TPL' ){
                    return false;
                }        
            }
        },
        lockCrn(oLockedBy) {
            if (oLockedBy)
                if (oLockedBy === '') {
                    return false;
                }
        },
        getUrl: function (sCrn, sAttachmentNo) {
            return window.location.origin + "/sap/opu/odata/sap/ZFI_CASH_RECEIPTS_SRV/AttachmentsSet(Crn='" + sCrn + "',AttachmentNo='" + sAttachmentNo + "')/$value";
        }
    };
});