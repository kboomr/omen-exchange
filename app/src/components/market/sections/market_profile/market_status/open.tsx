import { BigNumber } from 'ethers/utils'
import React, { useEffect, useState } from 'react'
import { RouteComponentProps, useHistory, withRouter } from 'react-router-dom'
import styled from 'styled-components'

import { useCpk } from '../../../../../hooks'
import { WhenConnected, useConnectedWeb3Context } from '../../../../../hooks/connectedWeb3'
import { useGraphMarketTradeData } from '../../../../../hooks/useGraphMarketTradeData'
import { useRealityLink } from '../../../../../hooks/useRealityLink'
import { CPKService } from '../../../../../services'
import { BalanceItem, MarketMakerData, OutcomeTableValue, Status } from '../../../../../util/types'
import { Button, ButtonContainer } from '../../../../button'
import { ButtonType } from '../../../../button/button_styling_types'
import { MarketScale } from '../../../common/market_scale'
import { MarketTopDetailsOpen } from '../../../common/market_top_details_open'
import { OutcomeTable } from '../../../common/outcome_table'
import { PositionTable } from '../../../common/position_table'
import { ViewCard } from '../../../common/view_card'
import { WarningMessage } from '../../../common/warning_message'
import { MarketBuyContainer } from '../../market_buy/market_buy_container'
import { MarketHistoryContainer } from '../../market_history/market_history_container'
import { MarketNavigation } from '../../market_navigation'
import { MarketPoolLiquidityContainer } from '../../market_pooling/market_pool_liquidity_container'
import { MarketSellContainer } from '../../market_sell/market_sell_container'

export const TopCard = styled(ViewCard)`
  padding: 24px;
  padding-bottom: 0;
  margin-bottom: 24px;
`

export const BottomCard = styled(ViewCard)``

const MessageWrapper = styled.div`
  border-radius: 4px;
  border: ${({ theme }) => theme.borders.borderLineDisabled};
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 20px 25px;
`

const Title = styled.h2`
  color: ${props => props.theme.colors.textColorDarker};
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.2px;
  line-height: 1.2;
  margin: 0 0 8px;
`

const Text = styled.p`
  color: ${props => props.theme.colors.textColor};
  font-size: 14px;
  font-weight: normal;
  letter-spacing: 0.2px;
  line-height: 1.5;
  margin: 0;
`

export const StyledButtonContainer = styled(ButtonContainer)`
  margin: 0 -24px;
  margin-bottom: -1px;
  padding: 20px 24px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  &.border {
    border-top: 1px solid ${props => props.theme.colors.verticalDivider};
  }
`

const SellBuyWrapper = styled.div`
  display: flex;
  align-items: center;

  & > * + * {
    margin-left: 12px;
  }
`

const WarningMessageStyled = styled(WarningMessage)`
  margin-top: 20px;
`

interface Props extends RouteComponentProps<Record<string, string | undefined>> {
  account: Maybe<string>
  isScalar: boolean
  marketMakerData: MarketMakerData
  fetchGraphMarketMakerData: () => Promise<void>
}

const Wrapper = (props: Props) => {
  const { fetchGraphMarketMakerData, isScalar, marketMakerData } = props
  const realitioBaseUrl = useRealityLink()
  const history = useHistory()
  const context = useConnectedWeb3Context()
  const { account, library: provider } = context
  const cpk = useCpk()

  const {
    address: marketMakerAddress,
    balances,
    collateral,
    fee,
    isQuestionFinalized,
    outcomeTokenMarginalPrices,
    question,
    scalarHigh,
    scalarLow,
    totalPoolShares,
  } = marketMakerData

  const isQuestionOpen = question.resolution.valueOf() < Date.now()

  const userHasShares = balances.some((balanceItem: BalanceItem) => {
    const { shares } = balanceItem
    return !shares.isZero()
  })

  const probabilities = balances.map(balance => balance.probability)
  const hasFunding = totalPoolShares.gt(0)

  const renderTableData = () => {
    const disabledColumns = [OutcomeTableValue.Payout, OutcomeTableValue.Outcome, OutcomeTableValue.Probability]

    if (!userHasShares) {
      disabledColumns.push(OutcomeTableValue.Shares)
    }

    return (
      <OutcomeTable
        balances={balances}
        collateral={collateral}
        disabledColumns={disabledColumns}
        displayRadioSelection={false}
        probabilities={probabilities}
      />
    )
  }

  const openQuestionMessage = (
    <MessageWrapper>
      <Title>The question is being resolved.</Title>
      <Text>You will be able to redeem your winnings as soon as the market is resolved.</Text>
    </MessageWrapper>
  )

  const openInRealitioButton = (
    <Button
      buttonType={ButtonType.secondaryLine}
      onClick={() => {
        window.open(`${realitioBaseUrl}/app/#!/question/${question.id}`)
      }}
    >
      Answer on Reality.eth
    </Button>
  )

  const buySellButtons = (
    <SellBuyWrapper>
      <Button
        buttonType={ButtonType.secondaryLine}
        disabled={!userHasShares || !hasFunding}
        onClick={() => {
          setCurrentTab('SELL')
        }}
      >
        Sell
      </Button>
      <Button
        buttonType={ButtonType.secondaryLine}
        disabled={!hasFunding}
        onClick={() => {
          setCurrentTab('BUY')
        }}
      >
        Buy
      </Button>
    </SellBuyWrapper>
  )

  const [currentTab, setCurrentTab] = useState('SWAP')

  const marketTabs = {
    swap: 'SWAP',
    pool: 'POOL',
    history: 'HISTORY',
    verify: 'VERIFY',
    buy: 'BUY',
    sell: 'SELL',
  }

  const switchMarketTab = (newTab: string) => {
    setCurrentTab(newTab)
  }

  const { status, trades } = useGraphMarketTradeData(question.title, collateral.address, cpk?.address.toLowerCase())

  return (
    <>
      <TopCard>
        <MarketTopDetailsOpen marketMakerData={marketMakerData} />
      </TopCard>
      <BottomCard>
        <MarketNavigation
          activeTab={currentTab}
          isQuestionFinalized={isQuestionFinalized}
          marketAddress={marketMakerAddress}
          resolutionDate={question.resolution}
          switchMarketTab={switchMarketTab}
        ></MarketNavigation>
        {currentTab === marketTabs.swap && (
          <>
            {isScalar ? (
              <>
                <MarketScale
                  balances={balances}
                  borderBottom={false}
                  borderTop={true}
                  collateral={collateral}
                  currentPrediction={outcomeTokenMarginalPrices[1]}
                  fee={fee}
                  lowerBound={scalarLow || new BigNumber(0)}
                  positionTable={true}
                  startingPointTitle={'Current prediction'}
                  status={status}
                  trades={trades}
                  unit={question.title ? question.title.split('[')[1].split(']')[0] : ''}
                  upperBound={scalarHigh || new BigNumber(0)}
                />
              </>
            ) : (
              renderTableData()
            )}
            {isQuestionOpen && openQuestionMessage}
            {!hasFunding && !isQuestionOpen && (
              <WarningMessageStyled
                additionalDescription={''}
                description={'Trading is disabled due to lack of liquidity.'}
                grayscale={true}
                href={''}
                hyperlinkDescription={''}
              />
            )}
            <WhenConnected>
              <StyledButtonContainer className={!hasFunding || isQuestionOpen ? 'border' : ''}>
                <Button
                  buttonType={ButtonType.secondaryLine}
                  onClick={() => {
                    history.goBack()
                  }}
                >
                  Back
                </Button>
                {isQuestionOpen ? openInRealitioButton : buySellButtons}
              </StyledButtonContainer>
            </WhenConnected>
          </>
        )}
        {currentTab === marketTabs.pool && (
          <MarketPoolLiquidityContainer
            fetchGraphMarketMakerData={fetchGraphMarketMakerData}
            isScalar={isScalar}
            marketMakerData={marketMakerData}
            switchMarketTab={switchMarketTab}
          />
        )}
        {currentTab === marketTabs.history && <MarketHistoryContainer marketMakerData={marketMakerData} />}
        {currentTab === marketTabs.buy && (
          <MarketBuyContainer
            fetchGraphMarketMakerData={fetchGraphMarketMakerData}
            isScalar={isScalar}
            marketMakerData={marketMakerData}
            switchMarketTab={switchMarketTab}
          />
        )}
        {currentTab === marketTabs.sell && (
          <MarketSellContainer
            fetchGraphMarketMakerData={fetchGraphMarketMakerData}
            isScalar={isScalar}
            marketMakerData={marketMakerData}
            switchMarketTab={switchMarketTab}
          />
        )}
        {/* {currentTab === marketTabs.verify && <p>verify</p>} */}
      </BottomCard>
    </>
  )
}

export const OpenMarketDetails = withRouter(Wrapper)
