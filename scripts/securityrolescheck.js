var _allRoles = {};
var _allTeams = {};
var _allDisplayNames = {};
var _allPrivilegesMapping = {};
var _allPrivileges = {};
var _eventsLoaded = false;
var _userTeamsLoaded = false;
var _userRolesLoaded = false;
var _currentBusinessUnit = null;

$(document).ready(function () {
    initVars();

    loadAllDisplayNames();
    loadUsers();
    //addMockUsers(40);

    loadPrivilegesMapping();
    loadPrivileges();
    loadAllRoles();
    loadAllTeams();
    loadEvents();
});

function initVars() {
    initVar(_allRoles);
    initVar(_allTeams);
    initVar(_allDisplayNames);
    initVar(_allPrivilegesMapping);
    initVar(_allPrivileges);
}

function initVar(varRef) {
    varRef.Values = [];
    varRef.Loaded = false;
}

function loadEvents() {
    $('#list-users-col').on('click', '.list-group-item', function (e) {
        e.preventDefault();
        $('.list-group-item.active').removeClass('active');
        $(this).toggleClass('active');

        var userId = $(this).data('guid');
        _currentBusinessUnit = $(this).data('businessunitid');
        resetPage();

        $('#roles-page').loading('toggle');
        getUserRolesIds(userId, loadRolesCallback, loadRolesFailCallback);
        getUserTeamsIds(userId, loadTeamsCallback, loadTeamsFailCallback);

        e.stopImmediatePropagation();
    });

    $('#txtSearch').keyup(function () {
        var currentValue = $(this).val();

        if (!currentValue) {
            $('#list-users-col a').show();
        } else {
            setTimeout(function () {
                if (currentValue == $('#txtSearch').val()) {
                    $('#list-users-col a').hide();
                    $('#list-users-col a[data-name*=' + currentValue.toLowerCase() + ']').show();
                }
            }, 750);
        }
    });
}

function loadAllDisplayNames() {
    var entityName = 'EntityDefinitions';
    var select = 'LogicalName,DisplayName';

    CRMHelper.Data.WebAPI.ExecuteQuery(entityName, select, null, null, null, null, true, loadAllDisplayNamesCallback, loadAllDisplayNamesFailCallback);
}

function loadAllDisplayNamesCallback(result) {
    _allDisplayNames.Values = result;
    _allDisplayNames.Loaded = true;

    loadPrivilegesHTML();
}

function loadAllDisplayNamesFailCallback(req) {
    defaultError('Error loading Display Names', 'DisplayNames load', req);
}

function loadPrivileges() {
    var entityName = 'privilege';
    var select = 'accessright,privilegeid,name';
    CRMHelper.Data.WebAPI.ExecuteQuery(entityName, select, null, null, null, null, true, loadPrivilegesCallback, loadPrivilegesFailCallback);
}

function loadPrivilegesCallback(result) {
    _allPrivileges.Values = result;
    _allPrivileges.Loaded = true;

    loadPrivilegesHTML();
}

function loadPrivilegesFailCallback(req) {
    defaultError('Error loading Privileges', 'Privileges load', req);
}

function loadPrivilegesMapping() {
    $.getJSON('../json/Privileges_Mapping.js', loadPrivilegesMappingCallback)
        .fail(loadPrivilegesMappingFailCallback);
}

function loadPrivilegesMappingCallback(result) {
    _allPrivilegesMapping.Values = result;
    _allPrivilegesMapping.Loaded = true;

    loadPrivilegesHTML();
}

function loadPrivilegesMappingFailCallback(req, status, error) {
    defaultError('Error loading Privileges Mapping', 'Privileges Mapping load', req);
}

function loadAllRoles() {
    var entityName = 'role';
    var select = 'roleid,name,roleidunique,_businessunitid_value,_parentroleid_value';

    CRMHelper.Data.WebAPI.ExecuteQuery(entityName, select, null, null, null, null, true, loadAllRolesCallback, loadAllRolesFailCallback);
}

function loadAllRolesCallback(result) {
    if (result && result.length > 0) {
        result.forEach(function (item, index) {
            _allRoles.Values.push({ roleid: item.roleid, name: item.name, roleidunique: item.roleidunique, businessunitid: item._businessunitid_value, parentroleid: item._parentroleid_value })
        });

        _allRoles.Loaded = true;

        if (_allTeams.Loaded === true) {
            loadAllTeamRoles();
        }
    }
}

function loadAllRolesFailCallback(req) {
    defaultError('Error loading Roles', 'Roles load', req);
}

function loadAllTeams() {
    var entityName = 'team';
    var select = 'teamid,name';

    CRMHelper.Data.WebAPI.ExecuteQuery(entityName, select, null, null, null, null, true, loadAllTeamsCallback, loadAllTeamsFailCallback);
}

function loadAllTeamsCallback(result) {
    if (result && result.length > 0) {
        result.forEach(function (item, index) {
            _allTeams.Values.push({ teamid: item.teamid, name: item.name })
        });

        _allTeams.Loaded = true;

        if (_allRoles.Loaded === true) {
            loadAllTeamRoles();
        }
    }
}

function loadAllTeamsFailCallback(req) {
    defaultError('Error loading Teams', 'Teams load', req);
}

function loadAllTeamRoles() {
    var entityName = 'teamroles';
    var select = 'teamid,roleid';

    CRMHelper.Data.WebAPI.ExecuteQuery(entityName, select, null, null, null, null, true, loadAllTeamRolesCallback, loadAllTeamRolesFailCallback);
}

function loadAllTeamRolesCallback(result) {
    if (result && result.length > 0) {
        var groupedTeams = result.reduce(function (r, a) {
            r[a.teamid] = r[a.teamid] || [];
            r[a.teamid].push(a.roleid);
            return r;
        }, Object.create(null));

        if (groupedTeams) {
            for (var i in groupedTeams) {
                _allTeams.Values.find(ele => ele.teamid == i).roles = groupedTeams[i];
            }
        }
    }

    showWaitingMessage();
}

function loadAllTeamRolesFailCallback(req) {
    defaultError('Error loading Team Roles', 'Team Roles load', req);
}

function showWaitingMessage() {
    $('#roles-page').loading('stop');
    $('#list-roles-col').loading({ message: 'Waiting' });
    $('#list-teams-col').loading({ message: 'Waiting' });
    $('#list-permissions-col').loading({ message: 'Waiting' });
}

function loadUsers() {
    var select = 'systemuserid,fullname,_businessunitid_value';
    CRMHelper.Data.WebAPI.ExecuteQuery('systemuser', select, 'isdisabled eq false', null, 'fullname asc', null, true, loadUsersCallback, loadUsersErrorCallback);
}

function loadUsersCallback(allUsers) {
    for (var i = 0; i < allUsers.length; i++) {
        var user = allUsers[i];
        var rowUser = getUserCheckboxElement(user.systemuserid, user.fullname, user._businessunitid_value);
        $('#list-users-col').append(rowUser);
    }
}

function loadUsersErrorCallback(req) {
    defaultError('Error loading Users', 'Users Column - Users', req);
}

function loadPrivilegesHTML() {
    if (_allDisplayNames.Loaded && _allPrivilegesMapping.Loaded && _allPrivileges.Loaded) {
        setMappings();
        orderMappings();
        _allPrivilegesMapping.Values.forEach(function (item, index) {
            try {
                if (!item.IsMisc && !item.IsPrivacy) {
                    var html = '';
                    html += '<tr>';
                    html += '   <td>';
                    html += '       ' + item.EntityName;
                    html += '   </td>';
                    html += '   <td>'; // Create
                    html += '       ' + getPrivilegeDiv(item, 'Create');
                    html += '   </td>';
                    html += '   <td>'; // Read
                    html += '       ' + getPrivilegeDiv(item, 'Read');
                    html += '   </td>';
                    html += '   <td>'; // Write
                    html += '       ' + getPrivilegeDiv(item, 'Write');
                    html += '   </td>';
                    html += '   <td>'; // Delete
                    html += '       ' + getPrivilegeDiv(item, 'Delete');
                    html += '   </td>';
                    html += '   <td>'; // Append
                    html += '       ' + getPrivilegeDiv(item, 'Append');
                    html += '   </td>';
                    html += '   <td>'; // Append To	
                    html += '       ' + getPrivilegeDiv(item, 'AppendTo');
                    html += '   </td>';
                    html += '   <td>'; // Assign
                    html += '       ' + getPrivilegeDiv(item, 'Assign');
                    html += '   </td>';
                    html += '   <td>'; // Share
                    html += '       ' + getPrivilegeDiv(item, 'Share');
                    html += '   </td>';
                    html += '</tr>';

                    $('#tbl_' + item.TabName).append(html);
                } else {
                    var html = '';
                    html += '<tr>';
                    html += '   <td>';
                    html += '       ' + item.EntityName;
                    html += '   </td>';
                    html += '   <td>';
                    html += '       <div class="privilege_div privilege_empty tooltipster" id="' + item.Privileges[0].Id + '"></div>';
                    html += '   </td>';
                    html += '</tr>';

                    var htmlSuffix = item.IsMisc ? '_misc' : '_privacy';
                    var eleId = '#tbl_' + item.TabName + htmlSuffix;
                    $(eleId).append(html);
                }
            } catch (e) {
                console.log('Nope: ' + item.EntityName);
            }
        });

        $('.left-col').loading('stop');
        $('#list-permissions-col').loading('stop');

        loadTooltipster();
        loadStickyTable();
    }
}

function loadTooltipster() {
    $('.tooltipster').click(function () {
        var privId = $(this).prop('id');
        loadTooltipRoles(privId);

        $(this).tooltipster('content', getTooltipContent());
    });

    $('.tooltipster').tooltipster({
        theme: 'tooltipster-light',
        trigger: 'click',
        contentCloning: true,
        contentAsHTML: true,
        content: getTooltipContent()
    });
}

function loadStickyTable() {
    $('#table_core').stickyTableHeaders({
        scrollableArea: $('#tabCore')
        , fixedOffset: 1
        , marginTop: -1
    });

    $('#table_marketing').stickyTableHeaders({
        scrollableArea: $('#tabMarketing')
        , fixedOffset: 1
        , marginTop: -1
    });

    $('#table_sales').stickyTableHeaders({
        scrollableArea: $('#tabSales')
        , fixedOffset: 1
        , marginTop: -1
    });

    $('#table_service').stickyTableHeaders({
        scrollableArea: $('#tabService')
        , fixedOffset: 1
        , marginTop: -1
    });

    $('#table_businessmanagement').stickyTableHeaders({
        scrollableArea: $('#tabBusinessManagement')
        , fixedOffset: 1
        , marginTop: -1
    });

    $('#table_servicemanagement').stickyTableHeaders({
        scrollableArea: $('#tabServiceManagement')
        , fixedOffset: 1
        , marginTop: -1
    });

    $('#table_customization').stickyTableHeaders({
        scrollableArea: $('#tabCustomization')
        , fixedOffset: 1
        , marginTop: -1
    });

    $('#table_customentities').stickyTableHeaders({
        scrollableArea: $('#tabCustomEntities')
        , fixedOffset: 1
        , marginTop: -1
    });

    $('#table_other').stickyTableHeaders({
        scrollableArea: $('#tabOther')
        , fixedOffset: 1
        , marginTop: -1
    });
}

function loadTooltipRoles(privilegeId) {
    var roles = $('.role-row');
    $('#tooltip_content').html('None');

    if (roles.length > 0) {
        roles.each(function (index, item) {
            var role = _allRoles.Values.find(role => role.roleid == $(item).data('guid'));

            while (role.parentroleid) {
                role = _allRoles.Values.find(ele => ele.roleid == role.parentroleid);
            }

            if (!role.privileges || role.privileges.length < 1) { return true; }

            var privilege = role.privileges.find(priv => priv.privilegeid == privilegeId);

            if (!privilege) { return true; }
            if (getTooltipContent() == 'None') { $('#tooltip_content').html(''); }

            var additionalClass = translateDepthToCSSClass(privilege.privilegedepthmask);
            $('#tooltip_content').append('<div class="privilege_row"><div class="privilege_div privilege_empty tooltip_privilege ' + additionalClass + '"></div><div id="tooltip_role_name">' + role.name + '</div></div>');
        });
    } else {
        $('#tooltip_content').html("No roles available");
    }
}

function getTooltipContent() {
    return $('#tooltip_content').html();
}

function getPrivilegeDiv(privilegeMapping, type) {
    var privileges = privilegeMapping.Privileges;
    var privilege = privileges.find(priv => priv.Type == type);

    return privilege ? '<div class="privilege_div privilege_empty tooltipster" id="' + privilege.Id + '"></div>' : '';
}

function setMappings() {
    _allPrivileges.Values.forEach(function (item, index) {
        var privilegeName = '';
        var privilegeType = '';

        switch (item.accessright) {
            case 1: // Read
                privilegeName = item.name.replace('prvRead', '').replace('prvConfigure', '');
                privilegeType = 'Read';
                break;
            case 2: // Write
                privilegeName = item.name.replace('prvWrite', '');
                privilegeType = 'Write';
                break;
            case 4: // Append
                privilegeName = item.name.replace('prvAppend', '');
                privilegeType = 'Append';
                break;
            case 16: // AppendTo
                privilegeName = item.name.replace('prvAppendTo', '');
                privilegeType = 'AppendTo';
                break;
            case 32: // Create
                privilegeName = item.name.replace('prvCreate', '').replace('prvConfigure', '');
                privilegeType = 'Create';
                break;
            case 65536: // Delete
                privilegeName = item.name.replace('prvDelete', '');
                privilegeType = 'Delete';
                break;
            case 262144: // Share
                privilegeName = item.name.replace('prvShare', '');
                privilegeType = 'Share';
                break;
            case 524288: // Assign
                privilegeName = item.name.replace('prvAssign', '');
                privilegeType = 'Assign';
                break;
            default:
                privilegeName = item.name.replace('prvRead', '').replace('prvConfigure', '').replace('prvCreate', '');
                privilegeType = 'Other';
                break;
        }

        setPrivilegeInfo(item, privilegeName, privilegeType);
    });
}

function orderMappings() {
    _allPrivilegesMapping.Values.sort(function (a, b) {
        var textA = a.EntityName.toUpperCase();
        var textB = b.EntityName.toUpperCase();
        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });
}

function setPrivilegeInfo(privilege, privilegeName, privilegeType) {
    var privMapping = _allPrivilegesMapping.Values.find(priv => priv.PrivilegeBase == privilegeName);

    if (!privMapping) {
        privMapping = createPrivilegeMapping(privilege, privilegeName, privilegeType);
    }

    if (!privMapping.Privileges) {
        privMapping.Privileges = [];
        setMappingDisplayName(privMapping);
    }

    var finalPrivilege = {};
    finalPrivilege.Id = privilege.privilegeid;
    finalPrivilege.Type = privilegeType;
    finalPrivilege.TypeCode = privilege.accessright;

    privMapping.Privileges.push(finalPrivilege);
}

function setMappingDisplayName(privMapping) {
    var x = privMapping;
    var displayObj = _allDisplayNames.Values.find(displayName => displayName.LogicalName == privMapping.PrivilegeBase.toLowerCase());

    if (displayObj) {
        try {
            var userLabel = displayObj.DisplayName.UserLocalizedLabel.Label;

            if (userLabel != privMapping.EntityName) {
                privMapping.EntityName = displayObj.DisplayName.UserLocalizedLabel.Label + ' (' + displayObj.LogicalName + ')';
            }
        } catch (e) { }
    }
}

function createPrivilegeMapping(privilege, privilegeName, privilegeType) {
    var customPrivMapping = {};
    var displayName = getDisplayNameByLogicalName(privilegeName);

    customPrivMapping.EntityName = displayName;
    customPrivMapping.IsMisc = false;
    customPrivMapping.IsPrivacy = false;
    customPrivMapping.PrivilegeBase = privilegeName;
    customPrivMapping.TabName = displayName.indexOf('(N/A)') > 0 ? 'Other' : 'CustomEntities';

    _allPrivilegesMapping.Values.push(customPrivMapping);
    return customPrivMapping;
}

function getDisplayNameByLogicalName(privilegeName) {
    var displayObj = _allDisplayNames.Values.find(displayName => displayName.LogicalName == privilegeName);

    if (displayObj) {
        try {
            return displayObj.DisplayName.UserLocalizedLabel.Label;
        } catch (e) {
            var description = 'Privilege Name: ' + privilegeName;
            description += '\ndisplayObj: ' + console.dir(displayObj);

            CRMHelper.Error.WriteErrorOnConsole('Display Name not found', description);
            return privilegeName + (' (N/A)');
        }
    } else {
        return privilegeName + (' (N/A)');
    }
}

function getUserCheckboxElement(guid, name, businessUnit) {
    var ret = '';
    ret += '<a href="#" class="list-group-item user-row" data-name="' + name.toLowerCase() + '" data-businessunitid="' + businessUnit + '" data-name="' + name + '" data-guid="' + guid + '" >';
    ret += name;
    ret += '</a>';

    return ret;
}

function getRoleCheckboxElement(guid, name, isDirectlyAssigned) {
    var extraClass = isDirectlyAssigned ? 'directly-assigned-role' : '';

    var ret = '';
    ret += '<div class="role-row ' + extraClass + '" data-guid="' + guid + '" data-name="' + name + '" data-selected="false">';
    ret += '    <label class="control checkbox pull-left">';
    ret += '        <input class="role-checkbox" type="checkbox" data-guid="' + guid + '" data-name="' + name + '" checked="true">';
    ret += '        <span class="checkbox-label checkbox-checked">' + name + '</span>';
    ret += '    </label>';
    ret += '    <i class="fa fa-users pull-right clickable-icon" style="display:none;" title="This Role belongs in a Team. Click to highlight the Team(s).">';
    ret += '    </i>';
    ret += '    <i class="fa fa-user-o pull-right" style="display:none;" title="Directly assigned role for this user">';
    ret += '    </i>';
    ret += '</div>';

    return ret;
}

function getTeamCheckboxElement(guid, name) {
    var ret = '';

    ret += '<div class="team-row" data-guid="' + guid + '" data-name="' + name + '" data-selected="false">';
    ret += '    <i class="fa fa-user-circle clickable-icon" title="Highlight Roles">';
    ret += '    </i>';
    ret += '    <span class="team-row-title">';
    ret += '        ' + name;
    ret += '    </span>';
    ret += '</div>';

    return ret;
}

function addMockUsers(qty) {
    for (var i = 0; i < qty; i++) {
        var ele = getUserCheckboxElement('xxxx' + i, 'User ' + i);
        $('#list-users-col').append(ele);
    }

    $('.left-col').loading('stop');
}

function loadRolesCallback(currentUserRoles) {
    //if (!currentUserRoles) { $('#roles-page').loading('stop'); return; }
    if (currentUserRoles) {
        currentUserRoles.forEach(function (item, index) {
            var currentRole = _allRoles.Values.find(ele => ele.roleid == item.roleid && ele.businessunitid == _currentBusinessUnit);

            var checkBox = getRoleCheckboxElement(currentRole.roleid, currentRole.name, true);
            $('#list-roles-col').append(checkBox);
        });
    }

    _userRolesLoaded = true;
    loadFullPrivileges();
}

function loadRolesPrivileges(filter) {
    var entityName = 'roleprivileges';
    var select = 'privilegeid,privilegedepthmask,roleid';

    CRMHelper.Data.WebAPI.ExecuteQuery(entityName, select, filter, null, null, null, true, loadRolesPrivilegesCallback, loadRolesPrivilegesFailCallback);
}

function loadRolesPrivilegesCallback(result) {
    if (result) {
        result.forEach(function (item, index) {
            var currentRole = _allRoles.Values.find(ele => ele.roleid == item.roleid);
            var currentPrivilege = {};

            currentPrivilege.privilegeid = item.privilegeid;
            currentPrivilege.privilegedepthmask = item.privilegedepthmask;
            currentRole.privileges.push(currentPrivilege);
        });
    }

    loadPermissions();
}

function loadRolesPrivilegesFailCallback() {
    defaultError('Error loading Privileges', 'Privileges load', req);
}

function loadRolesFailCallback(req) {
    defaultError('Error loading User Roles', 'Roles load', req);
}

function loadFullPrivileges() {
    if (_userRolesLoaded && _userTeamsLoaded) {
        var filter = '';

        $('.role-checkbox').each(function (index, item) {
            var initialRoleGuid = $(item).data('guid');
            var currentRole = _allRoles.Values.find(ele => ele.roleid == initialRoleGuid);

            while (currentRole.parentroleid) {
                currentRole = _allRoles.Values.find(ele => ele.roleid == currentRole.parentroleid);
            }

            if (!currentRole.privileges || currentRole.privileges.length == 0) {
                filter += ' or roleid eq ' + currentRole.roleid;
                currentRole.privileges = [];
            }
        });

        if (filter) {
            filter = 'roleprivilegeid eq null' + filter;
            loadRolesPrivileges(filter);
        } else {
            loadPermissions();
        }
    }
}

function loadTeamsCallback(currentUserTeams) {
    //if (!currentUserTeams) { $('#roles-page').loading('stop'); return; }

    if (currentUserTeams) {
        currentUserTeams.forEach(function (item, index) {
            var currentTeam = _allTeams.Values.find(ele => ele.teamid == item.teamid);

            var checkBox = getTeamCheckboxElement(currentTeam.teamid, currentTeam.name);
            $('#list-teams-col').append(checkBox);

            if (currentTeam.roles) {
                addRolesFromTeam(currentTeam.roles);
            }
        });
    }

    _userTeamsLoaded = true;
    loadFullPrivileges();
}

function addRolesFromTeam(teamRoles) {
    teamRoles.forEach(function (item, index) {
        var existingRoleItem = $('.role-row[data-guid="' + item + '"]');
        if (existingRoleItem && existingRoleItem.length > 0) {
            existingRoleItem.addClass('role-from-team');
        } else {
            var roleName = _allRoles.Values.find(ele => ele.roleid == item).name;
            var newRoleItem = $(getRoleCheckboxElement(item, roleName, false)).addClass('role-from-team');
            $('#list-roles-col').append(newRoleItem);
        }
    });
}

function loadTeamsFailCallback(req) {
    defaultError('Error loading User Teams', 'Teams load', req);
}

function getUserRolesIds(userId, callback, failCallback) {
    var entityName = 'systemuserroles';
    var select = 'roleid';
    var filter = 'systemuserid eq ' + userId;

    return CRMHelper.Data.WebAPI.ExecuteQuery(entityName, select, filter, null, null, null, true, callback, failCallback);
}

function getUserTeamsIds(userId, callback, failCallback) {
    var entityName = 'teammembership';
    var select = 'teamid';
    var filter = 'systemuserid eq ' + userId;

    return CRMHelper.Data.WebAPI.ExecuteQuery(entityName, select, filter, null, null, null, true, callback, failCallback);
}

function loadPermissions() {
    if (!_eventsLoaded) {
        loadRolesEvents();
        loadTeamsEvents();
        _eventsLoaded = true;
    }

    resetPrivileges();

    $('.role-checkbox:checked').each(function (index, item) {
        var roleId = $(item).data('guid');
        var currentRole = _allRoles.Values.find(ele => ele.roleid == roleId);

        while (currentRole.parentroleid) {
            currentRole = _allRoles.Values.find(ele => ele.roleid == currentRole.parentroleid);
        }

        var privileges = currentRole.privileges;

        if (privileges) {
            privileges.forEach(function (priv, privIndex) {
                $('#' + priv.privilegeid).addClass(translateDepthToCSSClass(priv.privilegedepthmask));
            });
        }
    });

    $('#roles-page').loading('stop');
}

function translateDepthToCSSClass(depth) {
    switch (depth) {
        case 1:
            return 'privilege_user';
        case 2:
            return 'privilege_bunit';
        case 4:
            return 'privilege_child_bunit';
        case 8:
            return 'privilege_organization';
        default:
            return '';
    }
}

function resetPrivileges() {
    $('.privilege_div:not(.tooltip_privilege)')
        .removeClass('privilege_user')
        .removeClass('privilege_bunit')
        .removeClass('privilege_child_bunit')
        .removeClass('privilege_organization');

    _userTeamsLoaded = false;
    _userRolesLoaded = false;
}

function resetPage() {
    $('#list-roles-col').html('');
    $('#list-teams-col').html('');
    $('#list-roles-col').loading('stop');
    $('#list-teams-col').loading('stop');
    $('#list-permissions-col').loading('stop');
    $('#chkAllRoles').prop('checked', true);
    $('#highlightedRoles').html('');
    resetPrivileges();
}

function highlightRows(evElement, titleId, targetRowClass, sourceRowClass, highlightIds) {
    var selected = $(evElement).data('selected');
    var name = $(evElement).data('name');
    var finalIdsCount = 0;

    $('.' + targetRowClass).removeClass('selected');
    $('.' + sourceRowClass).data('selected', false);
    $('#' + titleId).html('');

    if (!selected) {
        idsCount = highlightIds && highlightIds.length > 0 ? highlightIds.length : 0;

        $(evElement).data('selected', true);

        if (highlightIds && idsCount > 0) {
            highlightIds.forEach(function (item, index) {
                var ele = $('.' + targetRowClass + '[data-guid="' + item + '"]');
                if (ele.length > 0) {
                    ele.addClass('selected');
                    finalIdsCount++;
                }
            });
        }

        $('#' + titleId).html('(<strong title="' + finalIdsCount + ' selected">' + name + '</strong> [' + finalIdsCount + '])');
    }
}

function getTeamsByRoleId(roleId) {
    var teamsIds = _allTeams.Values.filter(team => team.roles && team.roles.find(role => role == roleId) != null);
    return teamsIds.map(team => team.teamid);
}

function getRolesByTeamId(teamId) {
    var team = _allTeams.Values.find(ele => ele.teamid == teamId);

    return team.roles;
}

$('.dropdown-menu-item').click(function (e) {
    var selectedOption = $(this).text();

    if (selectedOption == 'All') {
        $('.user-row').toggle(true);
    } else if (selectedOption == 'Active') {
        showUserRows(true);
    } else if (selectedOption == 'Inactive') {
        showUserRows(false);
    }

    $('.dropdown-toggle-title').text(selectedOption);
    e.preventDefault();
});

$('#btnExport').click(function () {
    if ($('.user-row.active').length == 0) {
        alert('Please select an user first!');
        return;
    }

    var title = 'SimorCCRMUtilities-RolesCheck-' + $('.user-row.active').html() + '-' + Date.now();

    var printWindow = window.open('', '', 'height=400,width=800');
    printWindow.document.write('<html><head><title>' + title + '</title>');
    printWindow.document.write('<link rel="stylesheet" type="text/css" href="../styles/metro_bootstrap.min.css">');
    printWindow.document.write('<link rel="stylesheet" type="text/css" href="../styles/font_awesome.min.css">');
    printWindow.document.write('<link rel="stylesheet" type="text/css" href="../styles/jquery.loading.min.css">');
    printWindow.document.write('<link rel="stylesheet" type="text/css" href="../styles/animate.min.css">');
    printWindow.document.write('<link rel="stylesheet" type="text/css" href="../styles/custom.css">');
    printWindow.document.write('<link rel="stylesheet" type="text/css" href="../styles/securityrolescheck.css">');
    printWindow.document.write('<link rel="stylesheet" type="text/css" href="../styles/securityrolescheck_print.css">');
    printWindow.document.write('</head><body>');

    // User Name
    printWindow.document.write('<div id="user-name">');
    printWindow.document.write('<h2>' + $('.user-row.active').html() + '</h2> ');
    printWindow.document.write('<h10>' + Xrm.Page.context.getClientUrl() + ' - ' + new Date() + '</h10>');
    printWindow.document.write('</div>');
    // User Roles
    printWindow.document.write('<div id="user-roles">');
    printWindow.document.write($("#right-col-top").html());
    printWindow.document.write('</div>');
    // User Teams
    printWindow.document.write('<div id="user-teams">');
    printWindow.document.write($("#right-col-bottom").html());
    printWindow.document.write('</div>');
    // Core
    printWindow.document.write('<div class="user-privileges">');
    printWindow.document.write($("#tabCore").html());
    printWindow.document.write('</div>');
    // Marketing
    printWindow.document.write('<div class="user-privileges">');
    printWindow.document.write($("#tabMarketing").html());
    printWindow.document.write('</div>');
    // Sales
    printWindow.document.write('<div class="user-privileges">');
    printWindow.document.write($("#tabSales").html());
    printWindow.document.write('</div>');
    // Service
    printWindow.document.write('<div class="user-privileges">');
    printWindow.document.write($("#tabService").html());
    printWindow.document.write('</div>');
    // Business Management
    printWindow.document.write('<div class="user-privileges">');
    printWindow.document.write($("#tabBusinessManagement").html());
    printWindow.document.write('</div>');
    // Service Management
    printWindow.document.write('<div class="user-privileges">');
    printWindow.document.write($("#tabServiceManagement").html());
    printWindow.document.write('</div>');
    // Customization
    printWindow.document.write('<div class="user-privileges">');
    printWindow.document.write($("#tabCustomization").html());
    printWindow.document.write('</div>');
    // Custom Entities
    printWindow.document.write('<div class="user-privileges">');
    printWindow.document.write($("#tabCustomEntities").html());
    printWindow.document.write('</div>');
    // Other
    printWindow.document.write('<div class="user-privileges">');
    printWindow.document.write($("#tabOther").html());
    printWindow.document.write('</div>');

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(function () { printWindow.print() }, 750);
});

$('#list-roles-col').on('change', '.role-checkbox', function () {
    $('#chkAllRoles').prop('checked', $('.role-checkbox:checked').length == $('.role-checkbox').length);
    $(this).next('.checkbox-label').toggleClass('checkbox-checked');
    loadPermissions();
});

$('#chkAllRoles').change(function () {
    $('.role-checkbox').prop('checked', $(this).prop('checked'));
    $('.role-checkbox').next('.checkbox-label').toggleClass('checkbox-checked', $(this).prop('checked'));
    loadPermissions();
});

function loadRolesEvents() {
    $('#list-roles-col').on('click', '.clickable-icon', function () {
        var roleId = $(this).parent().data('guid');
        var teamsIds = getTeamsByRoleId(roleId);
        $('#list-roles-col .clickable-icon').not(this).removeClass('selected');
        $(this).toggleClass('selected');

        highlightRows($(this).parent(), 'highlightedTeams', 'team-row', 'role-row', teamsIds);
    });
}

function loadTeamsEvents() {
    $('#list-teams-col').on('click', '.clickable-icon', function () {
        var teamId = $(this).parent().data('guid');
        var rolesIds = getRolesByTeamId(teamId);
        $('#list-teams-col .clickable-icon').not(this).removeClass('selected');
        $(this).toggleClass('selected');

        highlightRows($(this).parent(), 'highlightedRoles', 'role-row', 'team-row', rolesIds);
    });
}