import { Button, TextField } from "@mui/material";
import { useWeb3React } from "@web3-react/core";
import { MaxUint256 } from "@ethersproject/constants";
import { BigNumber } from "ethers";
import { FC, useEffect, useState } from "react";
import { useNESTContract, usePVMContract } from "../../contracts/getContracts";
import { NESTPVMAddress } from "../../libs/addresses";
import {
  TransactionType,
  usePendingTransactions,
} from "../../libs/hooks/useTransactionReceipt";
import "./styles";
import { formatUnits } from "ethers/lib/utils";

type OrderType = {
  owner: string;
  openBlock: number;
  shares: number;
  index: number;
  expr: string;
};

const Estimate: FC = () => {
  const classPrefix = "Estimate";
  const { chainId, account, library } = useWeb3React();
  const { addPendingList, isTransactionPending, pendingList } =
    usePendingTransactions();
  const [expression, setExpression] = useState<string>("");
  const [orderList, setOrderlist] = useState<Array<OrderType>>([]);
  //   const [actionButtonDis, setActionButtonDis] = useState<boolean>(false);
  const [needNest, setNeedNest] = useState<BigNumber>(BigNumber.from("0"));
  const [nestAllow, setNestAllow] = useState<BigNumber>(BigNumber.from("0"));
  const PVM = usePVMContract();
  const nestToken = useNESTContract();

  const inputOnchange = async (e: any) => {
    if (!PVM) {
      return;
    }
    setExpression(e.target.value);
    const nestNeeded = await PVM.estimate(e.target.value);
    setNeedNest(nestNeeded);
  };

  // approve
  useEffect(() => {
    if (
      !chainId ||
      !account ||
      !library ||
      isTransactionPending(TransactionType.approve)
    ) {
      return;
    }
    if (!nestToken) {
      setNestAllow(BigNumber.from("0"));
      return;
    }
    const getAllow = async () => {
      const allowance = await nestToken.allowance(
        account,
        NESTPVMAddress[chainId]
      );
      setNestAllow(allowance);
    };
    getAllow();
  }, [account, chainId, library, nestToken, isTransactionPending, pendingList]);
  useEffect(() => {
    // setActionButtonDis(isTransactionPending(TransactionType.approve));
  }, [isTransactionPending, pendingList]);
  // getOrderList
  useEffect(() => {
    const getList = async () => {
      if (!PVM || !account) {
        return;
      }
      const data = await PVM.find(0, 200, 200, account);
      const data_result = data.filter(
        (item: OrderType) =>
          item.owner.toLocaleLowerCase() === account.toLocaleLowerCase() &&
          item.shares !== 0
      );
      console.log(data_result)
      setOrderlist([...data_result]);
    };
    getList();
  }, [PVM, account, pendingList]);

  // check
  const checkAllow = () => {
    return nestAllow.gte(needNest) ? true : false;
  };

  // transaction
  const approve = () => {
    if (!nestToken || !PVM) {
      return;
    }
    // setActionButtonDis(true);
    nestToken
      .approve(PVM.address, MaxUint256)
      .catch((error: any) => {
        // setActionButtonDis(false);
        console.log(error);
      })
      .then((res: any) => {
        addPendingList({ hash: res.hash, type: TransactionType.approve });
        console.log(res);
      });
  };
  const buy = async () => {
    if (!PVM) {
      return;
    }
    // setActionButtonDis(true);
    PVM.buy(expression)
      .catch((error: any) => {
        // setActionButtonDis(false);
        console.log(error);
      })
      .then((res: any) => {
        addPendingList({ hash: res.hash, type: TransactionType.buy });
        // setActionButtonDis(false);
        console.log(res);
      });
  };

  const sell = async (index: number) => {
    if (!PVM) {
      return;
    }
    PVM.sell(index)
      .catch((error: any) => {
        // setActionButtonDis(false);
        console.log(error);
      })
      .then((res: any) => {
        addPendingList({ hash: res.hash, type: TransactionType.sell });
        // setActionButtonDis(false);
        console.log(res);
      });
  };

  // ui
  const orderLi = () => {
    return orderList.map((item, index) => {
      return (
        <li key={`${index} + order`}>
          <TextField
            id="outlined-read-only-input"
            label={index + 1}
            value={item.expr}
            InputProps={{
              readOnly: true,
            }}
          />
          <Button
            className="sell"
            variant="contained"
            onClick={() => {
              sell(item.index);
            }}
          >
            Sell
          </Button>
        </li>
      );
    });
  };
  return (
    <div className={classPrefix}>
      <TextField
        className="stringInput"
        id="outlined-multiline-static"
        label="Expressions"
        multiline
        rows={4}
        defaultValue="Default Value"
        value={expression}
        onChange={inputOnchange}
      />
      <p className="nestLimit">
        nestLimit:{parseFloat(formatUnits(needNest, 18)).toFixed(4)}
      </p>
      <Button
        className="actionButton"
        variant="contained"
        size="large"
        onClick={() => {
          checkAllow() ? buy() : approve();
        }}
      >
        {checkAllow() ? "BUY" : "approve"}
      </Button>
      <ul>{orderLi()}</ul>
    </div>
  );
};

export default Estimate;
