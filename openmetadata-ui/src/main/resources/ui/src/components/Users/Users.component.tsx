/*
 *  Copyright 2022 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import {
  Button as AntDButton,
  Card,
  Image,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import { ReactComponent as EditIcon } from 'assets/svg/edit-new.svg';
import { ReactComponent as IconTeamsGrey } from 'assets/svg/teams-grey.svg';
import { AxiosError } from 'axios';
import TableDataCardV2 from 'components/common/table-data-card-v2/TableDataCardV2';
import TeamsSelectable from 'components/TeamsSelectable/TeamsSelectable';
import { capitalize, isEmpty, isEqual, toLower } from 'lodash';
import { observer } from 'mobx-react';
import React, {
  Fragment,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { changePassword } from 'rest/auth-API';
import { getRoles } from 'rest/rolesAPIV1';
import { getEntityName } from 'utils/EntityUtils';
import {
  getUserPath,
  PAGE_SIZE,
  PAGE_SIZE_LARGE,
  TERM_ADMIN,
} from '../../constants/constants';
import { observerOptions } from '../../constants/Mydata.constants';
import {
  getUserCurrentTab,
  profileInfo,
  USER_PROFILE_TABS,
} from '../../constants/usersprofile.constants';
import { FeedFilter } from '../../enums/mydata.enum';
import { AuthTypes } from '../../enums/signin.enum';
import {
  ChangePasswordRequest,
  RequestType,
} from '../../generated/auth/changePasswordRequest';
import { ThreadType } from '../../generated/entity/feed/thread';
import { Role } from '../../generated/entity/teams/role';
import { EntityReference } from '../../generated/entity/teams/user';
import { Paging } from '../../generated/type/paging';
import { useElementInView } from '../../hooks/useElementInView';
import { getNonDeletedTeams } from '../../utils/CommonUtils';
import {
  getImageWithResolutionAndFallback,
  ImageQuality,
} from '../../utils/ProfilerUtils';
import { dropdownIcon as DropDownIcon } from '../../utils/svgconstant';
import SVGIcons, { Icons } from '../../utils/SvgUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';
import ActivityFeedList from '../ActivityFeed/ActivityFeedList/ActivityFeedList';
import {
  filterListTasks,
  getFeedFilterDropdownIcon,
} from '../ActivityFeed/ActivityFeedList/ActivityFeedList.util';
import { useAuthContext } from '../authentication/auth-provider/AuthProvider';
import { Button } from '../buttons/Button/Button';
import Description from '../common/description/Description';
import ErrorPlaceHolder from '../common/error-with-placeholder/ErrorPlaceHolder';
import NextPrevious from '../common/next-previous/NextPrevious';
import ProfilePicture from '../common/ProfilePicture/ProfilePicture';
import TabsPane from '../common/TabsPane/TabsPane';
import PageLayoutV1 from '../containers/PageLayoutV1';
import DropDownList from '../dropdown/DropDownList';
import Loader from '../Loader/Loader';
import ChangePasswordForm from './ChangePasswordForm';
import { Props } from './Users.interface';
import './Users.style.less';
import { userPageFilterList } from './Users.util';

const Users = ({
  userData,
  followingEntities,
  ownedEntities,
  feedData,
  isFeedLoading,
  isUserEntitiesLoading,
  postFeedHandler,
  deletePostHandler,
  fetchFeedHandler,
  paging,
  updateUserDetails,
  isAdminUser,
  isLoggedinUser,
  isAuthDisabled,
  updateThreadHandler,
  username,
  tab,
  feedFilter,
  setFeedFilter,
  threadType,
  onFollowingEntityPaginate,
  onOwnedEntityPaginate,
  onSwitchChange,
}: Props) => {
  const [activeTab, setActiveTab] = useState(getUserCurrentTab(tab));
  const [elementRef, isInView] = useElementInView(observerOptions);
  const [displayName, setDisplayName] = useState(userData.displayName);
  const [isDisplayNameEdit, setIsDisplayNameEdit] = useState(false);
  const [isDescriptionEdit, setIsDescriptionEdit] = useState(false);
  const [isRolesEdit, setIsRolesEdit] = useState(false);
  const [isTeamsEdit, setIsTeamsEdit] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Array<string>>([]);
  const [selectedTeams, setSelectedTeams] = useState<Array<string>>([]);
  const [roles, setRoles] = useState<Array<Role>>([]);
  const history = useHistory();
  const [showFilterList, setShowFilterList] = useState(false);
  const [isImgUrlValid, SetIsImgUrlValid] = useState<boolean>(true);
  const [isChangePassword, setIsChangePassword] = useState<boolean>(false);
  const location = useLocation();
  const isTaskType = isEqual(threadType, ThreadType.Task);
  const [isLoading, setIsLoading] = useState(false);
  const [isRolesLoading, setIsRolesLoading] = useState<boolean>(false);

  const { authConfig } = useAuthContext();
  const { t } = useTranslation();

  const { isAuthProviderBasic } = useMemo(() => {
    return {
      isAuthProviderBasic:
        authConfig?.provider === AuthTypes.BASIC ||
        authConfig?.provider === AuthTypes.LDAP,
    };
  }, [authConfig]);

  const handleFilterDropdownChange = useCallback(
    (_e: React.MouseEvent<HTMLElement, MouseEvent>, value?: string) => {
      if (value) {
        fetchFeedHandler(threadType, undefined, value as FeedFilter);
        setFeedFilter(value as FeedFilter);
      }
      setShowFilterList(false);
    },
    [threadType, fetchFeedHandler]
  );

  const onDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
  };

  const activeTabHandler = (tabNum: number) => {
    setFeedFilter(tabNum === 1 ? FeedFilter.ALL : FeedFilter.OWNER);
    setActiveTab(tabNum);
    // To reset search params appends from other page for proper navigation
    location.search = '';
    if (profileInfo[tabNum - 1].path !== tab) {
      history.push({
        pathname: getUserPath(username, profileInfo[tabNum - 1].path),
        search: location.search,
      });
    }
  };

  const handleDisplayNameChange = () => {
    if (displayName !== userData.displayName) {
      updateUserDetails({ displayName: displayName || '' });
    }
    setIsDisplayNameEdit(false);
  };

  const handleDescriptionChange = async (description: string) => {
    await updateUserDetails({ description });

    setIsDescriptionEdit(false);
  };

  const handleRolesChange = () => {
    // filter out the roles , and exclude the admin one
    const updatedRoles = selectedRoles.filter(
      (roleId) => roleId !== toLower(TERM_ADMIN)
    );

    // get the admin role and send it as boolean value `isAdmin=Boolean(isAdmin)
    const isAdmin = selectedRoles.find(
      (roleId) => roleId === toLower(TERM_ADMIN)
    );
    updateUserDetails({
      roles: updatedRoles.map((roleId) => {
        const role = roles.find((r) => r.id === roleId);

        return { id: roleId, type: 'role', name: role?.name || '' };
      }),
      isAdmin: Boolean(isAdmin),
    });

    setIsRolesEdit(false);
  };
  const handleTeamsChange = () => {
    updateUserDetails({
      teams: selectedTeams.map((teamId) => {
        return { id: teamId, type: 'team' };
      }),
    });

    setIsTeamsEdit(false);
  };

  const handleOnRolesChange = (value: string[]) => {
    setSelectedRoles(value);
  };

  const handleOnTeamsChange = (value: string[]) => {
    setSelectedTeams(value);
  };

  const handleChangePassword = async (data: ChangePasswordRequest) => {
    try {
      setIsLoading(true);
      const sendData = {
        ...data,
        ...(isAdminUser &&
          !isLoggedinUser && {
            username: userData.name,
            requestType: RequestType.User,
          }),
      };
      await changePassword(sendData);
      setIsChangePassword(false);
      showSuccessToast(
        t('server.update-entity-success', { entity: t('label.password') })
      );
    } catch (err) {
      showErrorToast(err as AxiosError);
    } finally {
      setIsLoading(true);
    }
  };

  useEffect(() => {
    setActiveTab(getUserCurrentTab(tab));
  }, [tab]);

  const getDisplayNameComponent = () => {
    if (isAdminUser || isLoggedinUser || isAuthDisabled) {
      return (
        <div className="tw-w-full">
          {isDisplayNameEdit ? (
            <Space className="tw-w-full" direction="vertical">
              <input
                className="tw-form-inputs tw-form-inputs-padding tw-py-0.5 tw-w-full"
                data-testid="displayName"
                id="displayName"
                name="displayName"
                placeholder={t('label.display-name')}
                type="text"
                value={displayName}
                onChange={onDisplayNameChange}
              />
              <div className="d-flex tw-justify-end" data-testid="buttons">
                <Button
                  className="tw-px-1 tw-py-1 tw-rounded tw-text-sm tw-mr-1"
                  data-testid="cancel-displayName"
                  size="custom"
                  theme="primary"
                  variant="contained"
                  onMouseDown={() => setIsDisplayNameEdit(false)}>
                  <CloseOutlined />
                </Button>
                <Button
                  className="tw-px-1 tw-py-1 tw-rounded tw-text-sm"
                  data-testid="save-displayName"
                  size="custom"
                  theme="primary"
                  variant="contained"
                  onClick={handleDisplayNameChange}>
                  <CheckOutlined />
                </Button>
              </div>
            </Space>
          ) : (
            <Fragment>
              <span className="tw-text-base tw-font-medium tw-mr-2 tw-overflow-auto">
                {userData.displayName ||
                  t('label.add-entity', { entity: t('label.display-name') })}
              </span>
              <button
                className="tw-ml-2 focus:tw-outline-none"
                data-testid="edit-displayName"
                onClick={() => setIsDisplayNameEdit(true)}>
                <EditIcon width={16} />
              </button>
            </Fragment>
          )}
        </div>
      );
    } else {
      return (
        <p className="tw-mt-2">
          {getEntityName(userData as unknown as EntityReference)}
        </p>
      );
    }
  };

  const getDescriptionComponent = () => {
    if (isAdminUser || isLoggedinUser || isAuthDisabled) {
      return (
        <div className="flex items-center justify-between">
          <Description
            description={userData.description || ''}
            entityName={getEntityName(userData as unknown as EntityReference)}
            hasEditAccess={isAdminUser || isLoggedinUser}
            isEdit={isDescriptionEdit}
            onCancel={() => setIsDescriptionEdit(false)}
            onDescriptionEdit={() => setIsDescriptionEdit(true)}
            onDescriptionUpdate={handleDescriptionChange}
          />
        </div>
      );
    } else {
      return (
        <div className="p-x-sm">
          <p className="m-t-xs">
            {userData.description || (
              <span className="text-grey-muted">
                {t('label.no-entity', {
                  entity: t('label.description'),
                })}
              </span>
            )}
          </p>
        </div>
      );
    }
  };

  const getChangePasswordComponent = () => {
    return (
      <div>
        <Typography.Text
          className="text-primary text-xs cursor-pointer"
          onClick={() => setIsChangePassword(true)}>
          {t('label.change-entity', { entity: t('label.password-lowercase') })}
        </Typography.Text>

        <ChangePasswordForm
          isLoading={isLoading}
          isLoggedinUser={isLoggedinUser}
          visible={isChangePassword}
          onCancel={() => setIsChangePassword(false)}
          onSave={(data) => handleChangePassword(data)}
        />
      </div>
    );
  };

  const getTeamsComponent = () => {
    const teamsElement = (
      <Fragment>
        {getNonDeletedTeams(userData.teams ?? []).map((team, i) => (
          <div
            className="tw-mb-2 d-flex tw-items-center tw-gap-2"
            data-testid={team.name}
            key={i}>
            <IconTeamsGrey height={16} width={16} />
            <Typography.Text
              className="ant-typography-ellipsis-custom w-48"
              ellipsis={{ tooltip: true }}>
              {getEntityName(team)}
            </Typography.Text>
          </div>
        ))}
        {isEmpty(userData.teams) && (
          <span className="text-grey-muted ">{t('message.no-team-found')}</span>
        )}
      </Fragment>
    );

    if (!isAdminUser && !isAuthDisabled) {
      return (
        <Card
          className="ant-card-feed tw-relative panel-shadow-color"
          key="teams-card"
          style={{
            marginTop: '20px',
          }}
          title={
            <div className="d-flex tw-items-center tw-justify-between">
              <h6 className="tw-heading tw-mb-0">{t('label.team-plural')}</h6>
            </div>
          }>
          <div className="tw-mb-4">{teamsElement}</div>
        </Card>
      );
    } else {
      return (
        <Card
          className="ant-card-feed tw-relative panel-shadow-color"
          key="teams-card"
          style={{
            marginTop: '20px',
          }}
          title={
            <div className="d-flex tw-items-center tw-justify-between">
              <h6 className="tw-heading tw-mb-0">{t('label.team-plural')}</h6>
              {!isTeamsEdit && (
                <button
                  className="tw-ml-2 focus:tw-outline-none "
                  data-testid="edit-teams"
                  onClick={() => setIsTeamsEdit(true)}>
                  <EditIcon width={16} />
                </button>
              )}
            </div>
          }>
          <div className="tw-mb-4">
            {isTeamsEdit ? (
              <Space className="tw-w-full" direction="vertical">
                <TeamsSelectable
                  filterJoinable
                  selectedTeams={selectedTeams}
                  onSelectionChange={handleOnTeamsChange}
                />
                <div className="d-flex tw-justify-end" data-testid="buttons">
                  <Button
                    className="tw-px-1 tw-py-1 tw-rounded tw-text-sm tw-mr-1"
                    data-testid="cancel-teams"
                    size="custom"
                    theme="primary"
                    variant="contained"
                    onMouseDown={() => setIsTeamsEdit(false)}>
                    <CloseOutlined />
                  </Button>
                  <Button
                    className="tw-px-1 tw-py-1 tw-rounded tw-text-sm"
                    data-testid="save-teams"
                    size="custom"
                    theme="primary"
                    variant="contained"
                    onClick={handleTeamsChange}>
                    <CheckOutlined />
                  </Button>
                </div>
              </Space>
            ) : (
              teamsElement
            )}
          </div>
        </Card>
      );
    }
  };

  const getRolesComponent = () => {
    const userRolesOption = roles?.map((role) => ({
      label: getEntityName(role as unknown as EntityReference),
      value: role.id,
    }));
    if (!userData.isAdmin) {
      userRolesOption.push({
        label: TERM_ADMIN,
        value: toLower(TERM_ADMIN),
      });
    }

    const rolesElement = (
      <Fragment>
        {userData.isAdmin && (
          <div className="tw-mb-2 d-flex tw-items-center tw-gap-2">
            <SVGIcons alt="icon" className="tw-w-4" icon={Icons.USERS} />
            <span>{TERM_ADMIN}</span>
          </div>
        )}
        {userData.roles?.map((role, i) => (
          <div className="tw-mb-2 d-flex tw-items-center tw-gap-2" key={i}>
            <SVGIcons alt="icon" className="tw-w-4" icon={Icons.USERS} />
            <Typography.Text
              className="ant-typography-ellipsis-custom w-48"
              ellipsis={{ tooltip: true }}>
              {getEntityName(role)}
            </Typography.Text>
          </div>
        ))}
        {!userData.isAdmin && isEmpty(userData.roles) && (
          <span className="text-grey-muted ">
            {t('message.no-roles-assigned')}
          </span>
        )}
      </Fragment>
    );

    if (!isAdminUser && !isAuthDisabled) {
      return (
        <Card
          className="ant-card-feed tw-relative"
          key="roles-card panel-shadow-color"
          style={{
            marginTop: '20px',
          }}
          title={
            <div className="d-flex tw-items-center tw-justify-between">
              <h6 className="tw-heading tw-mb-0">{t('label.role-plural')}</h6>
            </div>
          }>
          <div className="roles-container">{rolesElement}</div>
        </Card>
      );
    } else {
      return (
        <Card
          className="ant-card-feed tw-relative panel-shadow-color"
          key="roles-card"
          style={{
            marginTop: '20px',
          }}
          title={
            <div className="d-flex tw-items-center tw-justify-between">
              <h6 className="tw-heading tw-mb-0">{t('label.role-plural')}</h6>
              {!isRolesEdit && (
                <button
                  className="tw-ml-2 focus:tw-outline-none"
                  data-testid="edit-roles"
                  onClick={() => setIsRolesEdit(true)}>
                  <EditIcon width={16} />
                </button>
              )}
            </div>
          }>
          <div className="tw-mb-4">
            {isRolesEdit ? (
              <Space className="tw-w-full" direction="vertical">
                <Select
                  allowClear
                  showSearch
                  aria-label="Select roles"
                  className="w-full"
                  id="select-role"
                  loading={isRolesLoading}
                  mode="multiple"
                  options={userRolesOption}
                  placeholder={t('label.role-plural')}
                  value={!isRolesLoading ? selectedRoles : []}
                  onChange={handleOnRolesChange}
                />

                <div className="d-flex tw-justify-end" data-testid="buttons">
                  <Button
                    className="tw-px-1 tw-py-1 tw-rounded tw-text-sm tw-mr-1"
                    data-testid="cancel-roles"
                    size="custom"
                    theme="primary"
                    variant="contained"
                    onMouseDown={() => setIsRolesEdit(false)}>
                    <CloseOutlined />
                  </Button>
                  <Button
                    className="tw-px-1 tw-py-1 tw-rounded tw-text-sm"
                    data-testid="save-roles"
                    size="custom"
                    theme="primary"
                    variant="contained"
                    onClick={handleRolesChange}>
                    <CheckOutlined />
                  </Button>
                </div>
              </Space>
            ) : (
              rolesElement
            )}
          </div>
        </Card>
      );
    }
  };

  const getInheritedRolesComponent = () => {
    return (
      <Card
        className="ant-card-feed tw-relative panel-shadow-color"
        key="inherited-roles-card-component"
        style={{
          marginTop: '20px',
        }}
        title={
          <div className="d-flex">
            <h6 className="tw-heading tw-mb-0" data-testid="inherited-roles">
              {t('label.inherited-role-plural')}
            </h6>
          </div>
        }>
        <Fragment>
          {isEmpty(userData.inheritedRoles) ? (
            <div className="tw-mb-4">
              <span className="text-grey-muted">
                {t('message.no-inherited-roles-found')}
              </span>
            </div>
          ) : (
            <div className="d-flex tw-justify-between flex-col">
              {userData.inheritedRoles?.map((inheritedRole, i) => (
                <div
                  className="tw-mb-2 d-flex tw-items-center tw-gap-2"
                  key={i}>
                  <SVGIcons alt="icon" className="tw-w-4" icon={Icons.USERS} />

                  <Typography.Text
                    className="ant-typography-ellipsis-custom w-48"
                    ellipsis={{ tooltip: true }}>
                    {getEntityName(inheritedRole)}
                  </Typography.Text>
                </div>
              ))}
            </div>
          )}
        </Fragment>
      </Card>
    );
  };

  const image = useMemo(
    () =>
      getImageWithResolutionAndFallback(
        ImageQuality['6x'],
        userData.profile?.images
      ),
    [userData.profile?.images]
  );

  const fetchLeftPanel = () => {
    return (
      <div className="user-profile-antd-card" data-testid="left-panel">
        <Card
          className="ant-card-feed tw-relative panel-shadow-color"
          key="left-panel-card">
          {isImgUrlValid ? (
            <Image
              alt="profile"
              className="tw-w-full"
              preview={false}
              referrerPolicy="no-referrer"
              src={image || ''}
              onError={() => {
                SetIsImgUrlValid(false);
              }}
            />
          ) : (
            <div style={{ width: 'inherit' }}>
              <ProfilePicture
                displayName={userData?.displayName || userData.name}
                height="150"
                id={userData?.id || ''}
                name={userData?.name || ''}
                textClass="tw-text-5xl"
                width=""
              />
            </div>
          )}
          <Space className="p-sm" direction="vertical" size={8}>
            {getDisplayNameComponent()}
            <p>{userData.email}</p>
            {getDescriptionComponent()}
            {isAuthProviderBasic &&
              (isAdminUser || isLoggedinUser) &&
              getChangePasswordComponent()}
          </Space>
        </Card>
        {getTeamsComponent()}
        {getRolesComponent()}
        {getInheritedRolesComponent()}
      </div>
    );
  };

  const getLoader = () => {
    return isFeedLoading ? <Loader /> : null;
  };

  const getFeedTabData = () => {
    return (
      <Fragment>
        <div className="px-1.5 d-flex justify-between">
          <div className="tw-relative">
            <AntDButton
              className="flex items-center p-0"
              data-testid="feeds"
              icon={getFeedFilterDropdownIcon(feedFilter)}
              type="link"
              onClick={() => setShowFilterList((visible) => !visible)}>
              <span className="tw-font-medium tw-text-grey">
                {(activeTab === 1 ? userPageFilterList : filterListTasks).find(
                  (f) => f.value === feedFilter
                )?.name || capitalize(feedFilter)}
              </span>
              <DropDownIcon />
            </AntDButton>
            {showFilterList && (
              <DropDownList
                dropDownList={
                  activeTab === 1 ? userPageFilterList : filterListTasks
                }
                value={feedFilter}
                onSelect={handleFilterDropdownChange}
              />
            )}
          </div>
          {isTaskType ? (
            <Space align="end" size={5}>
              <Switch onChange={onSwitchChange} />
              <span className="tw-ml-1">{t('label.closed-task-plural')}</span>
            </Space>
          ) : null}
        </div>
        <div className="m-t-xs">
          <ActivityFeedList
            hideFeedFilter
            hideThreadFilter
            withSidePanel
            className=""
            deletePostHandler={deletePostHandler}
            feedList={feedData}
            isFeedLoading={isFeedLoading}
            postFeedHandler={postFeedHandler}
            updateThreadHandler={updateThreadHandler}
          />
        </div>
        <div
          data-testid="observer-element"
          id="observer-element"
          ref={elementRef as RefObject<HTMLDivElement>}>
          {getLoader()}
        </div>
        <div className="p-t-md" />
      </Fragment>
    );
  };

  const prepareSelectedRoles = () => {
    const defaultRoles = [...(userData.roles?.map((role) => role.id) || [])];
    if (userData.isAdmin) {
      defaultRoles.push(toLower(TERM_ADMIN));
    }
    setSelectedRoles(defaultRoles);
  };

  const prepareSelectedTeams = () => {
    setSelectedTeams(
      getNonDeletedTeams(userData.teams || []).map((team) => team.id)
    );
  };

  const fetchMoreFeed = (
    isElementInView: boolean,
    pagingObj: Paging,
    isLoading: boolean
  ) => {
    if (isElementInView && pagingObj?.after && !isLoading) {
      const threadType =
        activeTab === 2 ? ThreadType.Task : ThreadType.Conversation;
      fetchFeedHandler(threadType, pagingObj.after);
    }
  };

  const fetchRoles = async () => {
    setIsRolesLoading(true);
    try {
      const response = await getRoles(
        '',
        undefined,
        undefined,
        false,
        PAGE_SIZE_LARGE
      );
      setRoles(response.data);
    } catch (err) {
      setRoles([]);
      showErrorToast(
        err as AxiosError,
        t('server.entity-fetch-error', {
          entity: t('label.role-plural'),
        })
      );
    } finally {
      setIsRolesLoading(false);
    }
  };

  useEffect(() => {
    fetchMoreFeed(isInView, paging, isFeedLoading);
  }, [isInView, paging, isFeedLoading]);

  useEffect(() => {
    prepareSelectedRoles();
    prepareSelectedTeams();
  }, [userData]);

  useEffect(() => {
    if (image) {
      SetIsImgUrlValid(true);
    }
  }, [image]);

  useEffect(() => {
    if (isRolesEdit && isEmpty(roles)) {
      fetchRoles();
    }
  }, [isRolesEdit, roles]);

  const getEntityData = useCallback(
    (tabNumber: number) => {
      const entityData = tabNumber === 3 ? ownedEntities : followingEntities;
      if (isUserEntitiesLoading) {
        return <Loader />;
      }

      return (
        <div data-testid="table-container">
          {entityData.data.length ? (
            <>
              {entityData.data.map(({ _source, _id = '' }, index) => (
                <TableDataCardV2
                  className="m-b-sm cursor-pointer"
                  id={_id}
                  key={index}
                  source={_source}
                />
              ))}
              {entityData.total > PAGE_SIZE && entityData.data.length > 0 && (
                <NextPrevious
                  isNumberBased
                  currentPage={entityData.currPage}
                  pageSize={PAGE_SIZE}
                  paging={{} as Paging}
                  pagingHandler={
                    tabNumber === 3
                      ? onOwnedEntityPaginate
                      : onFollowingEntityPaginate
                  }
                  totalCount={entityData.total}
                />
              )}
            </>
          ) : (
            <ErrorPlaceHolder>
              <Typography.Paragraph>
                {tabNumber === 3
                  ? t('server.you-have-not-action-anything-yet', {
                      action: t('label.owned-lowercase'),
                    })
                  : t('server.you-have-not-action-anything-yet', {
                      action: t('label.followed-lowercase'),
                    })}
              </Typography.Paragraph>
            </ErrorPlaceHolder>
          )}
        </div>
      );
    },
    [followingEntities, ownedEntities, isUserEntitiesLoading]
  );

  return (
    <PageLayoutV1
      className="tw-h-full"
      leftPanel={fetchLeftPanel()}
      pageTitle={t('label.user')}>
      <div className="m-b-md">
        <TabsPane
          activeTab={activeTab}
          className="flex-initial"
          setActiveTab={activeTabHandler}
          tabs={USER_PROFILE_TABS}
        />
      </div>
      <div>{(activeTab === 1 || activeTab === 2) && getFeedTabData()}</div>
      <div>{activeTab === 3 && getEntityData(3)}</div>
      <div>{activeTab === 4 && getEntityData(4)}</div>
    </PageLayoutV1>
  );
};

export default observer(Users);
